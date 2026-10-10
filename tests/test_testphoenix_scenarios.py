import uuid
import httpx
import pytest
from playwright.sync_api import Page, expect

from testphoenix.models import IntentStep, StepAction, StepStatus, FailureCategory
from testphoenix.engine import TestPhoenixEngine
from testphoenix.reporter import TestPhoenixReporter

def reset_database(backend_url: str):
    """Utility to reset SQLite demo data for deterministic testing."""
    res = httpx.post(f"{backend_url}/api/test/reset")
    assert res.status_code == 200, f"Failed to reset test DB: {res.text}"

def test_scenario_a_version_a_original_ui_passes(page: Page, test_environment):
    """
    Scenario A — Version A (Original UI):
    1. Runs with original intent and canonical selectors.
    2. Confirms original selector '#create-task-btn' works directly.
    3. Completes task creation and verifies postcondition.
    4. Records final status: PASS.
    """
    backend_url = test_environment["backend_url"]
    frontend_url = test_environment["frontend_url"]
    reset_database(backend_url)

    engine = TestPhoenixEngine()
    page.goto(f"{frontend_url}/?mode=version-a")

    unique_title = f"Baseline Task {uuid.uuid4().hex[:6]}"

    # Step 1: Open creation modal
    step_open = IntentStep(
        intent="Click button to create new task",
        original_locator="#create-task-btn",
        expected_role="button",
        expected_name="Create Task",
        action=StepAction.CLICK,
        postcondition=lambda p: p.locator("#task-modal").is_visible(),
        postcondition_description="Task creation modal is visible"
    )
    status_open = engine.execute_step(page, step_open, test_name="Scenario A: Open Modal")
    assert status_open == StepStatus.PASS

    # Step 2: Fill title
    step_title = IntentStep(
        intent="Enter task title",
        original_locator="#task-title-input",
        expected_role="textbox",
        expected_name="Task Title",
        action=StepAction.FILL,
        input_data=unique_title
    )
    status_title = engine.execute_step(page, step_title, test_name="Scenario A: Fill Title")
    assert status_title == StepStatus.PASS

    # Step 3: Fill assignee
    step_assignee = IntentStep(
        intent="Enter task assignee",
        original_locator="#task-assignee-input",
        expected_role="textbox",
        expected_name="Assignee",
        action=StepAction.FILL,
        input_data="Lead Architect"
    )
    status_assignee = engine.execute_step(page, step_assignee, test_name="Scenario A: Fill Assignee")
    assert status_assignee == StepStatus.PASS

    # Step 4: Submit task
    step_submit = IntentStep(
        intent="Submit task form and persist",
        original_locator="#submit-task-btn",
        expected_role="button",
        expected_name="Save Task",
        action=StepAction.CLICK,
        postcondition=lambda p: p.locator(".task-card").filter(has_text=unique_title).count() > 0,
        postcondition_description="Created task appears in UI card deck"
    )
    status_submit = engine.execute_step(page, step_submit, test_name="Scenario A: Submit Task")
    assert status_submit == StepStatus.PASS

    # Backend persistence verification
    api_res = httpx.get(f"{backend_url}/api/tasks")
    assert any(t["title"] == unique_title for t in api_res.json())

def test_scenario_b_version_b_redesign_self_heals(page: Page, test_environment):
    """
    Scenario B — Version B (Redesigned UI):
    1. Uses the exact same original test intent and original selectors (#create-task-btn).
    2. Original selector fails because the UI underwent redesign.
    3. TestPhoenix inspects active DOM, ranks candidate replacements (#new-work-item-btn),
       explains why replacement won, and executes recovery action.
    4. Heals title input (#workitem-title-input), assignee input (#workitem-owner-input), and submit button.
    5. Verifies created item through UI and backend SQLite persistence.
    6. Records final status: SELF-HEALED.
    """
    backend_url = test_environment["backend_url"]
    frontend_url = test_environment["frontend_url"]
    reset_database(backend_url)

    engine = TestPhoenixEngine()
    page.goto(f"{frontend_url}/?mode=version-b")

    unique_title = f"Autonomous Feature {uuid.uuid4().hex[:6]}"

    # Step 1: Open creation dialog (using original legacy selector '#create-task-btn')
    step_open = IntentStep(
        intent="Click button to create new task",
        original_locator="#create-task-btn", # DOES NOT EXIST on Version B
        expected_role="button",
        expected_name="Create Task",
        action=StepAction.CLICK,
        postcondition=lambda p: p.locator("#workitem-slideover").is_visible(),
        postcondition_description="Composer slide-out sheet is visible"
    )
    status_open = engine.execute_step(page, step_open, test_name="Scenario B: Open Creation Composer")
    # Must self-heal!
    assert status_open == StepStatus.SELF_HEALED
    assert step_open.diagnostics.selected_candidate is not None
    assert step_open.diagnostics.selected_candidate.selector == "#new-work-item-btn"
    assert step_open.diagnostics.score_margin >= 0.15

    # Step 2: Fill task title (using original legacy selector '#task-title-input')
    step_title = IntentStep(
        intent="Enter task title",
        original_locator="#task-title-input", # DOES NOT EXIST on Version B
        expected_role="textbox",
        expected_name="Task Title",
        action=StepAction.FILL,
        input_data=unique_title
    )
    status_title = engine.execute_step(page, step_title, test_name="Scenario B: Fill Title")
    assert status_title == StepStatus.SELF_HEALED
    assert step_title.diagnostics.selected_candidate.selector == "#workitem-title-input"

    # Step 3: Fill assignee (using original legacy selector '#task-assignee-input')
    step_assignee = IntentStep(
        intent="Enter task assignee",
        original_locator="#task-assignee-input", # DOES NOT EXIST on Version B
        expected_role="textbox",
        expected_name="Assignee",
        action=StepAction.FILL,
        input_data="Lead Architect"
    )
    status_assignee = engine.execute_step(page, step_assignee, test_name="Scenario B: Fill Assignee")
    assert status_assignee == StepStatus.SELF_HEALED
    assert step_assignee.diagnostics.selected_candidate.selector == "#workitem-owner-input"

    # Step 4: Submit task (using original legacy selector '#submit-task-btn')
    step_submit = IntentStep(
        intent="Submit task form and persist",
        original_locator="#submit-task-btn", # DOES NOT EXIST on Version B
        expected_role="button",
        expected_name="Save Task",
        action=StepAction.CLICK,
        postcondition=lambda p: p.locator(".redesign-card").filter(has_text=unique_title).count() > 0,
        postcondition_description="Created work item card appears in redesigned grid"
    )
    status_submit = engine.execute_step(page, step_submit, test_name="Scenario B: Submit Work Item")
    assert status_submit == StepStatus.SELF_HEALED
    assert step_submit.diagnostics.selected_candidate.selector == "#submit-workitem-btn"

    # Verify backend persistence in SQLite
    api_res = httpx.get(f"{backend_url}/api/tasks")
    assert any(t["title"] == unique_title for t in api_res.json())

def test_scenario_c_broken_version_backend_failure_reports_fail(page: Page, test_environment):
    """
    Scenario C — Broken Version (Genuine Backend Failure):
    1. Triggers controlled backend failure returning HTTP 500.
    2. Confirms the task creation operation fails with genuine server error.
    3. TestPhoenix identifies NETWORK_OR_BACKEND_ERROR.
    4. Does not search for unrelated controls or disguise application defect as a UI issue.
    5. Does not report SELF-HEALED.
    6. Records final status: FAIL.
    """
    backend_url = test_environment["backend_url"]
    frontend_url = test_environment["frontend_url"]
    reset_database(backend_url)

    engine = TestPhoenixEngine()
    page.goto(f"{frontend_url}/?mode=broken")

    failing_title = f"Defect Probe {uuid.uuid4().hex[:6]}"

    # Step 1: Open modal (works)
    step_open = IntentStep(
        intent="Click button to create new task",
        original_locator="#create-task-btn",
        expected_role="button",
        expected_name="Create Task",
        action=StepAction.CLICK,
        postcondition=lambda p: p.locator("#task-modal").is_visible()
    )
    engine.execute_step(page, step_open, test_name="Scenario C: Open Modal")

    # Step 2: Fill title
    step_title = IntentStep(
        intent="Enter task title",
        original_locator="#task-title-input",
        expected_role="textbox",
        action=StepAction.FILL,
        input_data=failing_title
    )
    engine.execute_step(page, step_title, test_name="Scenario C: Fill Title")

    # Step 3: Fill assignee
    step_assignee = IntentStep(
        intent="Enter task assignee",
        original_locator="#task-assignee-input",
        expected_role="textbox",
        action=StepAction.FILL,
        input_data="QA Engineer"
    )
    engine.execute_step(page, step_assignee, test_name="Scenario C: Fill Assignee")

    # Step 4: Submit form (Provokes HTTP 500)
    step_submit = IntentStep(
        intent="Submit task form and persist",
        original_locator="#submit-task-btn",
        expected_role="button",
        expected_name="Save Task",
        action=StepAction.CLICK,
        postcondition=lambda p: p.locator(".task-card").filter(has_text=failing_title).count() > 0,
        postcondition_description="Task persisted and displayed in UI"
    )
    status_submit = engine.execute_step(page, step_submit, test_name="Scenario C: Submit Form (Trigger 500)")

    # Must FAIL, never SELF-HEALED
    assert status_submit == StepStatus.FAIL
    assert step_submit.diagnostics.failure_category == FailureCategory.NETWORK_OR_BACKEND_ERROR
    assert any("500" in err for err in step_submit.diagnostics.network_errors)
    assert not step_submit.diagnostics.postcondition_verified

    # Ensure SQLite was not mutated
    api_res = httpx.get(f"{backend_url}/api/tasks")
    assert not any(t["title"] == failing_title for t in api_res.json())

def test_scenario_d_ambiguous_ui_requires_human_review(page: Page, test_environment):
    """
    Scenario D — Ambiguous UI Challenge:
    1. Opens Ambiguous UI page where two identical 'Create Task' buttons exist in different workstreams.
    2. Attempts action using missing legacy selector '#create-task-btn'.
    3. TestPhoenix discovers both '#btn-create-task-stream-alpha' and '#btn-create-task-stream-beta'.
    4. Evaluates candidate margin and discovers margin < 0.15 threshold.
    5. Refuses to make an unverified guess or take speculative action.
    6. Records final status: HUMAN REVIEW REQUIRED.
    """
    frontend_url = test_environment["frontend_url"]
    engine = TestPhoenixEngine()
    page.goto(f"{frontend_url}/?mode=ambiguous")

    step_ambig = IntentStep(
        intent="Click button to create new task",
        original_locator="#create-task-btn", # Missing from page
        expected_role="button",
        expected_name="Create Task",
        action=StepAction.CLICK,
        postcondition=lambda p: True
    )

    status = engine.execute_step(page, step_ambig, test_name="Scenario D: Ambiguous UI")

    assert status == StepStatus.HUMAN_REVIEW_REQUIRED
    assert step_ambig.diagnostics.failure_category == FailureCategory.AMBIGUOUS_MATCH
    assert step_ambig.diagnostics.score_margin is not None
    assert step_ambig.diagnostics.score_margin < engine.config.min_score_margin
    assert "Human review required" in step_ambig.diagnostics.rationale
