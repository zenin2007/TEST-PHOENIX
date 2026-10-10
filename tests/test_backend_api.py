import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import get_all_tasks

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"

def test_reset_and_list_tasks():
    response = client.post("/api/test/reset")
    assert response.status_code == 200
    
    list_resp = client.get("/api/tasks")
    assert list_resp.status_code == 200
    tasks = list_resp.json()
    assert len(tasks) >= 3
    assert any("Setup project" in t["title"] for t in tasks)

def test_create_task_success():
    client.post("/api/test/reset")
    new_task = {
        "title": "Automated Test Task 1",
        "description": "Integration verification payload",
        "assignee": "Test Runner",
        "status": "In Progress"
    }
    response = client.post("/api/tasks", json=new_task)
    assert response.status_code == 201
    created = response.json()
    assert created["id"] is not None
    assert created["title"] == new_task["title"]
    assert created["assignee"] == new_task["assignee"]

    # Verify retrieval by ID
    get_resp = client.get(f"/api/tasks/{created['id']}")
    assert get_resp.status_code == 200
    assert get_resp.json()["title"] == new_task["title"]

def test_controlled_backend_failure_via_header():
    client.post("/api/test/reset")
    initial_tasks = client.get("/api/tasks").json()
    initial_count = len(initial_tasks)

    failing_task = {
        "title": "Failed Task Header Attempt",
        "description": "Should fail with 500",
        "assignee": "Chaos Bot",
        "status": "Todo"
    }
    response = client.post(
        "/api/tasks",
        json=failing_task,
        headers={"X-Simulate-Backend-Failure": "true"}
    )
    assert response.status_code == 500
    error_data = response.json()
    assert "detail" in error_data

    # Verify database was NOT touched / no task created
    after_tasks = client.get("/api/tasks").json()
    assert len(after_tasks) == initial_count
    assert not any(t["title"] == failing_task["title"] for t in after_tasks)

def test_controlled_backend_failure_via_toggle():
    client.post("/api/test/reset")
    
    # Enable failure mode
    toggle_resp = client.post("/api/test/failure-mode", json={"enabled": True})
    assert toggle_resp.status_code == 200
    assert toggle_resp.json()["failure_mode_active"] is True

    failing_task = {
        "title": "Failed Task Toggle Attempt",
        "description": "Should fail with 500",
        "assignee": "Chaos Bot",
        "status": "Todo"
    }
    response = client.post("/api/tasks", json=failing_task)
    assert response.status_code == 500

    # Turn off failure mode
    toggle_off = client.post("/api/test/failure-mode", json={"enabled": False})
    assert toggle_off.status_code == 200

    # Now creation should succeed
    success_resp = client.post("/api/tasks", json=failing_task)
    assert success_resp.status_code == 201
    assert success_resp.json()["title"] == failing_task["title"]
