from fastapi import FastAPI, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from contextlib import asynccontextmanager

from backend.database import (
    init_db, get_all_tasks, get_task_by_id, create_task, reset_db_data,
    create_order, get_all_orders, get_all_healing_memories, clear_healing_memory
)
from backend.models import (
    TaskCreate, TaskResponse, FailureModeRequest, ResetDataRequest, TestRunRequest,
    OrderCreate, OrderResponse, LiveTestRequest, LiveTestResponse
)


# Controlled test failure state (in-memory, reset on command or app reload)
_failure_mode_active = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite tables on startup
    init_db()
    existing = get_all_tasks()
    if not existing:
        reset_db_data(seed=True)
    yield

app = FastAPI(
    title="TestPhoenix Intent-Aware Self-Healing Platform API",
    description="Backend API and test runner telemetry for TestPhoenix",
    version="2.0.0",
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

# ==================== Task Management Endpoints ====================

@app.get("/api/tasks", response_model=List[TaskResponse])
def list_tasks():
    """Retrieve all tasks from SQLite database."""
    return get_all_tasks()

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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "message": "Database transaction failure: simulated internal server error",
                "error_code": "DB_TRANSACTION_FAILURE",
                "retryable": False
            }
        )

    return create_task(
        title=task.title,
        description=task.description,
        assignee=task.assignee,
        status=task.status
    )

# ==================== Second Demo: Orders & E-Commerce Endpoints ====================

@app.get("/api/orders", response_model=List[OrderResponse])
def list_orders():
    """Retrieve all orders from SQLite database."""
    return get_all_orders()

@app.post("/api/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def add_order(order: OrderCreate):
    """Persist completed order to SQLite database."""
    return create_order(
        product_name=order.product_name,
        price=order.price,
        customer_name=order.customer_name,
        quantity=order.quantity,
        status=order.status
    )

# ==================== Healing Memory Endpoints ====================

@app.get("/api/healing/memory")
def get_healing_memory_records():
    """Retrieve all learned self-healing locator mappings from SQLite."""
    return get_all_healing_memories()

@app.post("/api/healing/clear")
def clear_all_healing_memory():
    """Reset the learned healing memory cache."""
    clear_healing_memory()
    return {"message": "Healing memory cache cleared successfully."}

# ==================== Test Harness Support Endpoints ====================

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
    orders = get_all_orders()
    return {
        "message": "Demo data reset successfully",
        "failure_mode_active": _failure_mode_active,
        "tasks_count": len(tasks),
        "orders_count": len(orders)
    }

# ==================== Test Execution Endpoints ====================

@app.post("/api/tests/run")
def trigger_test_run(payload: TestRunRequest):
    """
    Executes a real automated Playwright browser test using the TestPhoenix engine
    and stores the execution record in SQLite.
    """
    from backend.test_runner import execute_scenario_run
    try:
        run_record = execute_scenario_run(scenario_key=payload.scenario)
        return run_record
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Test scenario execution failed: {str(e)}"
        )

@app.post("/api/tests/normal")
def run_normal_test():
    from backend.test_runner import execute_scenario_run
    return execute_scenario_run(scenario_key="normal")

@app.post("/api/tests/self-healing")
def run_self_healing_test():
    from backend.test_runner import execute_scenario_run
    return execute_scenario_run(scenario_key="self-healing")

@app.post("/api/tests/broken-backend")
def run_broken_backend_test():
    from backend.test_runner import execute_scenario_run
    return execute_scenario_run(scenario_key="broken-backend")

@app.post("/api/tests/ambiguous")
def run_ambiguous_test():
    from backend.test_runner import execute_scenario_run
    return execute_scenario_run(scenario_key="ambiguous")

@app.post("/api/tests/shopping-a")
def run_shopping_a_test():
    from backend.test_runner import execute_scenario_run
    return execute_scenario_run(scenario_key="shopping-a")

@app.post("/api/tests/shopping-b")
def run_shopping_b_test():
    from backend.test_runner import execute_scenario_run
    return execute_scenario_run(scenario_key="shopping-b")

@app.post("/api/tests/live", response_model=LiveTestResponse)
@app.post("/api/tests/run-live", response_model=LiveTestResponse)
def run_live_website_test_endpoint(payload: LiveTestRequest):
    """
    Executes a real automated browser test against a live website URL using Playwright.
    Inspects DOM, extracts accessibility properties, captures real screenshots,
    records execution events, and stores telemetry in SQLite.
    """
    from backend.test_runner import execute_live_website_test
    try:
        result = execute_live_website_test(
            website_url=payload.website_url,
            test_name=payload.test_name,
            intent=payload.intent,
            expected_outcome=payload.expected_outcome
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Live website test execution failed: {str(e)}"
        )


@app.get("/api/tests/history")
@app.get("/api/runs")
def list_test_runs(limit: int = 50):
    """Retrieve recent test run history from SQLite."""
    from backend.database import get_test_runs
    return get_test_runs(limit=limit)

@app.get("/api/tests/history/{run_id}")
@app.get("/api/runs/{run_id}")
def get_test_run_details(run_id: int):
    """Retrieve full details and diagnostic logs for an individual test run."""
    from backend.database import get_test_run_by_id
    run = get_test_run_by_id(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Test run #{run_id} not found")
    return run

# ==================== Results Dashboard ====================

@app.get("/results")
@app.get("/dashboard")
@app.get("/")
def serve_results_page():
    from fastapi.responses import FileResponse
    import os
    results_path = os.path.join(os.path.dirname(__file__), "static", "results.html")
    if os.path.exists(results_path):
        return FileResponse(results_path)
    return {"message": "TestPhoenix API Online. Results page not found."}

# ==================== Controlled Demo Checkout Endpoints ====================

@app.get("/demo/checkout")
@app.get("/demo/checkout-a")
@app.get("/demo/checkout-b")
def serve_demo_checkout_page():
    from fastapi.responses import FileResponse
    import os
    demo_path = os.path.join(os.path.dirname(__file__), "static", "demo_checkout.html")
    if os.path.exists(demo_path):
        return FileResponse(demo_path)
    raise HTTPException(status_code=404, detail="Demo checkout page not found.")

@app.post("/api/demo/checkout-submit")
def submit_demo_checkout(force_500: bool = False):
    if force_500:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "message": "Database transaction failure: simulated internal server error",
                "error_code": "DB_TRANSACTION_FAILURE",
                "retryable": False
            }
        )
    return {"status": "ok", "message": "Payment verified and order confirmed", "order_id": 84920}


# ==================== Advanced Evaluation & Metrics Endpoints ====================

@app.get("/api/evaluation/latest")
def get_latest_evaluation():
    """Retrieve the latest evaluated benchmark report from JSON."""
    import os
    import json
    json_path = os.path.join(os.path.dirname(__file__), "..", "advanced_evaluation_report.json")
    if not os.path.exists(json_path):
        fallback_path = os.path.join(os.path.dirname(__file__), "..", "evaluation_report.json")
        if os.path.exists(fallback_path):
            with open(fallback_path, "r", encoding="utf-8") as f:
                return json.load(f)
        raise HTTPException(status_code=404, detail="No evaluation report found.")
    with open(json_path, "r", encoding="utf-8") as f:
        return json.load(f)

@app.get("/api/evaluation/csv")
def download_evaluation_csv():
    """Download the latest evaluated benchmark report as CSV."""
    from fastapi.responses import FileResponse
    import os
    csv_path = os.path.join(os.path.dirname(__file__), "..", "advanced_evaluation_report.csv")
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="No evaluation CSV report found.")
    return FileResponse(
        csv_path,
        media_type="text/csv",
        filename="advanced_evaluation_report.csv"
    )

@app.post("/api/evaluation/run")
def trigger_evaluation_run():
    """Execute the full multi-scenario evaluation matrix and return refreshed metrics."""
    from run_advanced_evaluation import run_advanced_evaluation
    try:
        report = run_advanced_evaluation(iterations=2)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation execution failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
