from fastapi import FastAPI, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from contextlib import asynccontextmanager

from backend.database import init_db, get_all_tasks, get_task_by_id, create_task, reset_db_data
from backend.models import TaskCreate, TaskResponse, FailureModeRequest, ResetDataRequest

# Controlled test failure state (in-memory, reset on command or app reload)
_failure_mode_active = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite table on startup
    init_db()
    existing = get_all_tasks()
    if not existing:
        reset_db_data(seed=True)
    yield

app = FastAPI(
    title="Self-Healing Test System Demo API",
    description="Backend API for task management demo application",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "failure_mode_active": _failure_mode_active
    }

@app.get("/api/tasks", response_model=List[TaskResponse])
def list_tasks():
    """Retrieve all tasks from SQLite database."""
    tasks = get_all_tasks()
    return tasks

@app.get("/api/tasks/{task_id}", response_model=TaskResponse)
def get_task(task_id: int):
    """Retrieve a single task by ID."""
    task = get_task_by_id(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found"
        )
    return task

@app.post("/api/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def add_task(
    task: TaskCreate,
    x_simulate_backend_failure: Optional[str] = Header(None, alias="X-Simulate-Backend-Failure")
):
    """
    Create a new task.
    If the controlled failure mode is enabled (via header or test toggle),
    simulates a real HTTP 500 backend database transaction failure without saving data.
    """
    simulate_failure = _failure_mode_active or (
        x_simulate_backend_failure is not None and x_simulate_backend_failure.strip().lower() in ("true", "1", "yes")
    )

    if simulate_failure:
        # Controlled backend failure: do not write to SQLite, return structured 500 error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "message": "Database transaction failure: simulated internal server error",
                "error_code": "DB_TRANSACTION_FAILURE",
                "retryable": False
            }
        )

    # Valid task persistence into SQLite
    created = create_task(
        title=task.title,
        description=task.description,
        assignee=task.assignee,
        status=task.status
    )
    return created

# Test automation support endpoints (strictly for local test harness / demo control)
@app.get("/api/test/failure-mode")
def get_failure_mode():
    return {"failure_mode_active": _failure_mode_active}

@app.post("/api/test/failure-mode")
def set_failure_mode(payload: FailureModeRequest):
    global _failure_mode_active
    _failure_mode_active = payload.enabled
    return {
        "message": f"Controlled backend failure mode {'enabled' if _failure_mode_active else 'disabled'}",
        "failure_mode_active": _failure_mode_active
    }

@app.post("/api/test/reset")
def reset_test_data(payload: Optional[ResetDataRequest] = None):
    """Reset database to known clean state for deterministic test repeatability."""
    global _failure_mode_active
    _failure_mode_active = False
    seed = payload.seed if payload else True
    reset_db_data(seed=seed)
    tasks = get_all_tasks()
    return {
        "message": "Demo data reset successfully",
        "failure_mode_active": _failure_mode_active,
        "tasks_count": len(tasks)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
