import uuid
import httpx
import pytest
from playwright.sync_api import Page, expect

def reset_database(backend_url: str):
    """Utility to reset SQLite demo data for deterministic testing."""
    res = httpx.post(f"{backend_url}/api/test/reset")
    assert res.status_code == 200, f"Failed to reset test DB: {res.text}"

def test_version_a_baseline_creates_task_successfully(page: Page, test_environment):
    """
    Scenario 1 — Version A Baseline End-to-End Test:
    1. Opens Version A in a real browser.
    2. Uses the canonical '#create-task-btn' selector.
    3. Fills all required task creation fields with unique data.
    4. Submits the form.
    5. Confirms the newly created task appears in the UI.
    6. Confirms via the backend API that the task is persisted in SQLite.
    7. Produces a deterministic PASS result.
    """
    backend_url = test_environment["backend_url"]
    frontend_url = test_environment["frontend_url"]

    # 1. Reset state
    reset_database(backend_url)

    # 2. Open Version A
    page.goto(f"{frontend_url}/?mode=version-a")
    expect(page.locator("h1")).to_contain_text("Tasks & Milestones")

    # 3. Target the canonical Create Task button
    create_btn = page.locator("#create-task-btn")
    expect(create_btn).to_be_visible()
    expect(create_btn).to_have_text("＋ Create Task")
    create_btn.click()

    # 4. Wait for modal and enter unique task data
    modal = page.locator("#task-modal")
    expect(modal).to_be_visible()

    unique_title = f"Release Automation Pipeline {uuid.uuid4().hex[:6]}"
    task_desc = "Verify multi-tier deployment configuration and telemetry"
    assignee_name = "DevOps Lead"

    page.locator("#task-title-input").fill(unique_title)
    page.locator("#task-desc-input").fill(task_desc)
    page.locator("#task-assignee-input").fill(assignee_name)
    page.locator("#task-status-select").select_option("In Progress")

    # 5. Submit form
    page.locator("#submit-task-btn").click()

    # 6. Verify modal closes
    expect(modal).not_to_be_visible()

    # 7. Verify new task appears in the UI
    new_task_card = page.locator(".task-card").filter(has_text=unique_title)
    expect(new_task_card).to_be_visible()
    expect(new_task_card).to_contain_text(assignee_name)
    expect(new_task_card).to_contain_text("In Progress")

    # 8. Verify persistence through the backend API
    api_response = httpx.get(f"{backend_url}/api/tasks")
    assert api_response.status_code == 200
    tasks = api_response.json()
    matching_tasks = [t for t in tasks if t["title"] == unique_title]
    assert len(matching_tasks) == 1, f"Task '{unique_title}' was not found in SQLite database"
    assert matching_tasks[0]["assignee"] == assignee_name
    assert matching_tasks[0]["status"] == "In Progress"

def test_controlled_backend_failure_reports_real_error(page: Page, test_environment):
    """
    Scenario 3 — Broken Version (Controlled Backend Failure):
    1. Opens Broken Version mode in a real browser.
    2. Submits task creation which deterministically triggers an HTTP 500 error.
    3. Confirms the backend returns HTTP 500.
    4. Confirms the UI shows an appropriate error alert.
    5. Confirms the task was NOT saved in SQLite.
    6. Verifies the test identifies and reports a true backend failure.
    """
    backend_url = test_environment["backend_url"]
    frontend_url = test_environment["frontend_url"]

    # 1. Reset state
    reset_database(backend_url)

    # 2. Navigate to Broken Mode
    page.goto(f"{frontend_url}/?mode=broken")
    expect(page.locator("h1")).to_contain_text("Broken Mode")

    # 3. Intercept API response to check HTTP 500
    with page.expect_response(lambda response: "/api/tasks" in response.url and response.request.method == "POST") as response_info:
        # Open task modal
        page.locator("#create-task-btn").click()
        expect(page.locator("#task-modal")).to_be_visible()

        failing_title = f"Failed Task Attempt {uuid.uuid4().hex[:6]}"
        page.locator("#task-title-input").fill(failing_title)
        page.locator("#task-assignee-input").fill("QA Engineer")
        page.locator("#submit-task-btn").click()

    response = response_info.value
    # Assert backend returned HTTP 500
    assert response.status == 500, f"Expected HTTP 500 but got {response.status}"

    # 4. Verify UI displays visible error message
    error_alert = page.locator("#error-alert")
    expect(error_alert).to_be_visible()
    expect(error_alert).to_contain_text("HTTP 500")

    # 5. Verify the task does NOT appear in the UI task cards
    failed_card = page.locator(".task-card").filter(has_text=failing_title)
    expect(failed_card).not_to_be_visible()

    # 6. Verify backend database was NOT mutated
    api_response = httpx.get(f"{backend_url}/api/tasks")
    assert api_response.status_code == 200
    all_tasks = api_response.json()
    assert not any(t["title"] == failing_title for t in all_tasks), (
        "Faulty task was incorrectly persisted in the database during simulated failure"
    )

def test_version_b_demonstrates_ui_redesign_and_selector_drift(page: Page, test_environment):
    """
    Scenario 2 Pre-condition — Version B Redesigned UI:
    1. Opens Version B in a real browser.
    2. Demonstrates that the legacy '#create-task-btn' selector is absent from the DOM
       (illustrating why a non-healing test breaks when interface changes).
    3. Uses the redesigned '#new-work-item-btn' and slide-out composer.
    4. Verifies the task is created and persisted through the shared backend and SQLite DB.
    """
    backend_url = test_environment["backend_url"]
    frontend_url = test_environment["frontend_url"]

    # 1. Reset state
    reset_database(backend_url)

    # 2. Open Version B
    page.goto(f"{frontend_url}/?mode=version-b")
    expect(page.locator("h1")).to_contain_text("Active Work Items")

    # 3. Confirm legacy selector '#create-task-btn' does NOT exist (selector drift)
    legacy_button = page.locator("#create-task-btn")
    expect(legacy_button).to_have_count(0)

    # 4. Use redesigned sidebar action button '#new-work-item-btn'
    redesigned_btn = page.locator("#new-work-item-btn")
    expect(redesigned_btn).to_be_visible()
    expect(redesigned_btn).to_contain_text("New Work Item")
    redesigned_btn.click()

    # 5. Fill redesigned composer drawer
    drawer = page.locator("#workitem-slideover")
    expect(drawer).to_be_visible()

    item_title = f"Refactored Item {uuid.uuid4().hex[:6]}"
    page.locator("#workitem-title-input").fill(item_title)
    page.locator("#workitem-desc-input").fill("Redesigned workflow persistence check")
    page.locator("#workitem-owner-input").fill("Design Lead")
    page.locator("#workitem-stage-select").select_option("Done")

    page.locator("#submit-workitem-btn").click()

    # 6. Verify item appears in redesigned card deck
    expect(drawer).not_to_be_visible()
    item_card = page.locator(".redesign-card").filter(has_text=item_title)
    expect(item_card).to_be_visible()
    expect(item_card).to_contain_text("Design Lead")

    # 7. Verify persistence in the same backend database
    api_response = httpx.get(f"{backend_url}/api/tasks")
    assert api_response.status_code == 200
    saved = [t for t in api_response.json() if t["title"] == item_title]
    assert len(saved) == 1
    assert saved[0]["status"] == "Done"

def test_legacy_selector_fails_on_version_b_without_healing(page: Page, test_environment):
    """
    Demonstrates why traditional brittle tests fail when UI undergoes redesign:
    Attempting to click '#create-task-btn' on Version B times out because the selector drifted.
    This defines the explicit problem contract that the Step 2 Self-Healing Engine will solve.
    """
    frontend_url = test_environment["frontend_url"]
    page.goto(f"{frontend_url}/?mode=version-b")
    
    # Legacy selector '#create-task-btn' must fail/timeout on Version B
    with pytest.raises(Exception) as exc_info:
        page.locator("#create-task-btn").click(timeout=1500)
    
    assert "Timeout" in str(exc_info.value) or "waiting for" in str(exc_info.value)

