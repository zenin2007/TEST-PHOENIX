import uuid
import httpx
import pytest
from playwright.sync_api import Page, expect

from testphoenix.models import IntentStep, StepAction, StepStatus, FailureCategory, IntentWorkflow
from testphoenix.engine import TestPhoenixEngine

def reset_database(backend_url: str):
    """Utility to reset SQLite demo data for deterministic testing."""
    res = httpx.post(f"{backend_url}/api/test/reset")
    assert res.status_code == 200, f"Failed to reset test DB: {res.text}"

# ==============================================================================
# Task 1: UI Change Test Suite & Workflow Reconstruction Matrix
# ==============================================================================

def test_matrix_changed_button_id(page: Page, test_environment):
    """
    Scenario 1: Changed Button ID
    - Button text is 'Create Task', but HTML ID changed from '#create-task-btn' to '#btn-launch-task-creator'.
    - Original Intent: 'Click button to create new task'
    - Original locator: '#create-task-btn' (fails)
    - Reconstructed step: '#btn-launch-task-creator' (discovered via DOM inspection and scored)
    - Outcome: Successfully recovers, executes, verifies postcondition -> SELF-HEALED.
    """
    frontend_url = test_environment["frontend_url"]
    engine = TestPhoenixEngine()

    # Load HTML fixture with changed button ID
    page.set_content("""
        <!DOCTYPE html>
        <html>
        <head><title>Changed Button ID Test</title></head>
        <body>
            <h1>Project Workspace</h1>
            <button id="btn-launch-task-creator" class="btn-primary" onclick="document.getElementById('modal').style.display='block'">
                Create Task
            </button>
            <div id="modal" style="display:none;">
                <p>Task Creator Sheet Opened</p>
            </div>
        </body>
        </html>
    """)

    step = IntentStep(
        intent="Click button to create new task",
        original_locator="#create-task-btn", # Obsolete ID
        expected_role="button",
        expected_name="Create Task",
        action=StepAction.CLICK,
        postcondition=lambda p: p.locator("#modal").is_visible(),
        postcondition_description="Task creator modal is displayed"
    )

    status = engine.execute_step(page, step, test_name="Matrix 1: Changed Button ID")

    assert status == StepStatus.SELF_HEALED
    assert step.diagnostics.selected_candidate is not None
    assert step.diagnostics.selected_candidate.selector == "#btn-launch-task-creator"
    assert step.diagnostics.selected_candidate.score.total_score >= 0.75
    assert step.diagnostics.postcondition_verified is True
    assert page.locator("#modal").is_visible()

def test_matrix_renamed_button(page: Page, test_environment):
    """
    Scenario 2: Renamed Button
    - Button label was changed from 'Create Task' to 'New Work Item' with ID '#new-work-item-btn'.
    - Original Intent: 'Click button to create new task'
    - Original locator: '#create-task-btn' (fails)
    - Engine uses semantic synonym cluster ('create' ~ 'new', 'task' ~ 'work item')
    - Reconstructed step: '#new-work-item-btn'
    - Outcome: Successfully recovers -> SELF-HEALED.
    """
    frontend_url = test_environment["frontend_url"]
    engine = TestPhoenixEngine()
    page.goto(f"{frontend_url}/?mode=version-b")

    step = IntentStep(
        intent="Click button to create new task",
        original_locator="#create-task-btn", # Missing on Version B
        expected_role="button",
        expected_name="Create Task",
        action=StepAction.CLICK,
        postcondition=lambda p: p.locator("#workitem-slideover").is_visible(),
        postcondition_description="Composer slideover drawer is visible"
    )

    status = engine.execute_step(page, step, test_name="Matrix 2: Renamed Button")

    assert status == StepStatus.SELF_HEALED
    assert step.diagnostics.selected_candidate is not None
    assert step.diagnostics.selected_candidate.selector == "#new-work-item-btn"
    assert step.diagnostics.selected_candidate.score.total_score >= 0.75
    assert page.locator("#workitem-slideover").is_visible()

def test_matrix_rearranged_form_fields(page: Page):
    """
    Scenario 3: Rearranged Form Fields
    - In the DOM, fields are rendered in reversed order (Assignee first, then Description, then Title).
    - Original Intent: Fill Title, then Fill Assignee.
    - TestPhoenix identifies each input by semantic field name/placeholder/context rather than DOM index.
    - Outcome: Both inputs correctly identified and filled -> SELF-HEALED.
    """
    engine = TestPhoenixEngine()

    page.set_content("""
        <!DOCTYPE html>
        <html>
        <head><title>Rearranged Form Test</title></head>
        <body>
            <form id="task-form">
                <!-- Swapped order: Assignee field is placed first -->
                <div class="field-box">
                    <label for="rearranged-assignee">Task Assignee</label>
                    <input id="rearranged-assignee" name="assignee" placeholder="Enter task assignee..." />
                </div>
                <div class="field-box">
                    <label for="rearranged-desc">Task Scope & Description</label>
                    <textarea id="rearranged-desc" name="description" placeholder="Description details..."></textarea>
                </div>
                <!-- Title field is placed last -->
                <div class="field-box">
                    <label for="rearranged-title">Task Title</label>
                    <input id="rearranged-title" name="title" placeholder="Enter task title..." />
                </div>
            </form>
        </body>
        </html>
    """)

    # Step 1: Fill title using legacy locator '#task-title-input'
    step_title = IntentStep(
        intent="Enter task title",
        original_locator="#task-title-input",
        expected_role="textbox",
        expected_name="Task Title",
        action=StepAction.FILL,
        input_data="Refactored Core Architecture"
    )
    status_title = engine.execute_step(page, step_title, test_name="Matrix 3: Rearranged Field - Title")
    assert status_title == StepStatus.SELF_HEALED
    assert step_title.diagnostics.selected_candidate.selector == "#rearranged-title"
    assert page.locator("#rearranged-title").input_value() == "Refactored Core Architecture"

    # Step 2: Fill assignee using legacy locator '#task-assignee-input'
    step_assignee = IntentStep(
        intent="Enter task assignee",
        original_locator="#task-assignee-input",
        expected_role="textbox",
        expected_name="Assignee",
        action=StepAction.FILL,
        input_data="Senior Staff SRE"
    )
    status_assignee = engine.execute_step(page, step_assignee, test_name="Matrix 3: Rearranged Field - Assignee")
    assert status_assignee == StepStatus.SELF_HEALED
    assert step_assignee.diagnostics.selected_candidate.selector == "#rearranged-assignee"
    assert page.locator("#rearranged-assignee").input_value() == "Senior Staff SRE"

def test_matrix_changed_accessible_labels(page: Page):
    """
    Scenario 4: Changed Accessible Labels
    - Button text is a generic symbol or icon, but accessible label is 'Create new milestone task'.
    - Original Intent: 'Click button to create new task'
    - Original locator: '#create-task-btn' (fails)
    - Engine inspects accessibility attributes (aria-label, title) and role.
    - Outcome: Discovers candidate via accessibility tree -> SELF-HEALED.
    """
    engine = TestPhoenixEngine()

    page.set_content("""
        <!DOCTYPE html>
        <html>
        <head><title>Accessible Label Drift</title></head>
        <body>
            <button id="btn-icon-trigger"
                    aria-label="Create new milestone task"
                    title="Add new milestone workitem"
                    class="icon-btn"
                    onclick="document.getElementById('dialog').style.display='block'">
                <svg width="16" height="16"><path d="M8 0v16M0 8h16"/></svg>
            </button>
            <div id="dialog" style="display:none;">Milestone Dialog Ready</div>
        </body>
        </html>
    """)

    step = IntentStep(
        intent="Click button to create new task",
        original_locator="#create-task-btn", # Obsolete
        expected_role="button",
        expected_name="Create Task",
        action=StepAction.CLICK,
        postcondition=lambda p: p.locator("#dialog").is_visible(),
        postcondition_description="Milestone dialog is visible"
    )

    status = engine.execute_step(page, step, test_name="Matrix 4: Accessible Label")
    assert status == StepStatus.SELF_HEALED
    assert step.diagnostics.selected_candidate.selector == "#btn-icon-trigger"
    assert step.diagnostics.postcondition_verified is True
    assert page.locator("#dialog").is_visible()

def test_matrix_redesigned_page_layout_workflow(page: Page, test_environment):
    """
    Scenario 5: Redesigned Page Layout & Full Workflow Reconstruction
    - Verifies complete end-to-end workflow reconstruction across redesigned layout.
    - Stores original test intent.
    - Runs original workflow against redesigned interface.
    - Records initial failures.
    - Generates revised workflow from original intent.
    - Executes revised workflow safely.
    - Verifies expected result through both UI and backend.
    """
    backend_url = test_environment["backend_url"]
    frontend_url = test_environment["frontend_url"]
    reset_database(backend_url)

    engine = TestPhoenixEngine()
    page.goto(f"{frontend_url}/?mode=version-b")

    unique_title = f"Workflow Reconstructed {uuid.uuid4().hex[:6]}"

    # Declare canonical IntentWorkflow with original modal selectors
    workflow = IntentWorkflow(
        name="Create & Persist Work Item Workflow",
        original_intent="Open creation interface, enter title and assignee, submit form, and verify persistence",
        expected_outcome=f"Task '{unique_title}' persisted and visible",
        steps=[
            IntentStep(
                intent="Open task creation dialog",
                original_locator="#create-task-btn", # Missing on Version B
                expected_role="button",
                expected_name="Create Task",
                action=StepAction.CLICK,
                postcondition=lambda p: p.locator("#workitem-slideover").is_visible()
            ),
            IntentStep(
                intent="Enter task title",
                original_locator="#task-title-input", # Missing on Version B
                expected_role="textbox",
                expected_name="Task Title",
                action=StepAction.FILL,
                input_data=unique_title
            ),
            IntentStep(
                intent="Enter task assignee",
                original_locator="#task-assignee-input", # Missing on Version B
                expected_role="textbox",
                expected_name="Assignee",
                action=StepAction.FILL,
                input_data="Lead Architect"
            ),
            IntentStep(
                intent="Submit task form and persist",
                original_locator="#submit-task-btn", # Missing on Version B
                expected_role="button",
                expected_name="Save Task",
                action=StepAction.CLICK,
                postcondition=lambda p: p.locator(".redesign-card").filter(has_text=unique_title).count() > 0
            )
        ],
        ui_verifier=lambda p: p.locator(".redesign-card").filter(has_text=unique_title).is_visible(),
        backend_verifier=lambda: any(t["title"] == unique_title for t in httpx.get(f"{backend_url}/api/tasks").json())
    )

    report = engine.execute_workflow(page, workflow, verbose=True)

    assert report.final_status == StepStatus.SELF_HEALED
    assert report.recovery_attempts > 0
    assert len(report.reconstructed_workflow) == 4
    assert "#new-work-item-btn" in report.reconstructed_workflow[0]
    assert "#workitem-title-input" in report.reconstructed_workflow[1]
    assert "#workitem-owner-input" in report.reconstructed_workflow[2]
    assert "#submit-workitem-btn" in report.reconstructed_workflow[3]
    assert "VERIFIED: Expected outcome" in report.verification_evidence

def test_matrix_removed_or_unavailable_control(page: Page):
    """
    Scenario 6: Removed or Unavailable Controls
    - Control is either completely absent or has 'disabled' attribute.
    - Engine must NOT make speculative actions or click disabled elements.
    - Outcome: Genuine failure reported cleanly -> FAIL with ELEMENT_NOT_INTERACTABLE or ELEMENT_NOT_FOUND.
    """
    engine = TestPhoenixEngine()

    page.set_content("""
        <!DOCTYPE html>
        <html>
        <head><title>Unavailable Control Test</title></head>
        <body>
            <h1>Archived Project Archive</h1>
            <button id="btn-create-disabled" disabled aria-disabled="true" class="btn-disabled">
                Create Task (Unavailable)
            </button>
        </body>
        </html>
    """)

    step = IntentStep(
        intent="Click button to create new task",
        original_locator="#create-task-btn", # Does not exist
        expected_role="button",
        expected_name="Create Task",
        action=StepAction.CLICK
    )

    status = engine.execute_step(page, step, test_name="Matrix 6: Unavailable Control")

    assert status == StepStatus.FAIL
    assert step.diagnostics.failure_category in [FailureCategory.ELEMENT_NOT_INTERACTABLE, FailureCategory.ELEMENT_NOT_FOUND]
    assert step.diagnostics.recovery_attempts == 0

def test_matrix_multiple_similar_candidate_buttons(page: Page, test_environment):
    """
    Scenario 7: Multiple Similar Candidate Buttons (Ambiguity Safety Gate)
    - Two identical buttons exist on page with identical roles and labels (Stream Alpha vs Stream Beta).
    - Original locator '#create-task-btn' is missing.
    - Discovered candidates have score margin < 0.15 threshold.
    - Outcome: Safety gate halts execution to prevent speculative actions -> HUMAN REVIEW REQUIRED.
    """
    frontend_url = test_environment["frontend_url"]
    engine = TestPhoenixEngine()
    page.goto(f"{frontend_url}/?mode=ambiguous")

    step = IntentStep(
        intent="Click button to create new task",
        original_locator="#create-task-btn",
        expected_role="button",
        expected_name="Create Task",
        action=StepAction.CLICK,
        postcondition=lambda p: True
    )

    status = engine.execute_step(page, step, test_name="Matrix 7: Ambiguous Controls")

    assert status == StepStatus.HUMAN_REVIEW_REQUIRED
    assert step.diagnostics.failure_category == FailureCategory.AMBIGUOUS_MATCH
    assert step.diagnostics.score_margin is not None
    assert step.diagnostics.score_margin < engine.config.min_score_margin
    assert "Human review required" in step.diagnostics.rationale

# ==============================================================================
# Task 3: Genuine Failures Testing
# ==============================================================================

def test_matrix_genuine_http_500_backend_failure(page: Page, test_environment):
    """
    Scenario 8: Genuine HTTP 500 Backend Error
    - Form submission triggers controlled HTTP 500 database transaction error.
    - Engine detects network response >= 500.
    - Outcome: Must remain FAIL. Must NOT report SELF-HEALED.
    """
    backend_url = test_environment["backend_url"]
    frontend_url = test_environment["frontend_url"]
    reset_database(backend_url)

    engine = TestPhoenixEngine()
    page.goto(f"{frontend_url}/?mode=broken")

    failing_title = f"Genuine Failure 500 {uuid.uuid4().hex[:6]}"

    # Step 1: Open modal (works)
    step_open = IntentStep(
        intent="Click button to create new task",
        original_locator="#create-task-btn",
        action=StepAction.CLICK,
        postcondition=lambda p: p.locator("#task-modal").is_visible()
    )
    engine.execute_step(page, step_open)

    # Step 2: Fill title
    step_title = IntentStep(
        intent="Enter task title",
        original_locator="#task-title-input",
        action=StepAction.FILL,
        input_data=failing_title
    )
    engine.execute_step(page, step_title)

    # Step 3: Fill assignee
    step_assignee = IntentStep(
        intent="Enter task assignee",
        original_locator="#task-assignee-input",
        action=StepAction.FILL,
        input_data="Lead QA"
    )
    engine.execute_step(page, step_assignee)

    # Step 4: Submit task (Triggers HTTP 500)
    step_submit = IntentStep(
        intent="Submit task form and persist",
        original_locator="#submit-task-btn",
        action=StepAction.CLICK,
        postcondition=lambda p: p.locator(".task-card").filter(has_text=failing_title).count() > 0
    )
    status_submit = engine.execute_step(page, step_submit, test_name="Matrix 8: HTTP 500 Server Defect")

    assert status_submit == StepStatus.FAIL
    assert step_submit.diagnostics.failure_category == FailureCategory.NETWORK_OR_BACKEND_ERROR
    assert any("500" in err for err in step_submit.diagnostics.network_errors)
    assert not step_submit.diagnostics.postcondition_verified

    # Ensure backend did not persist corrupted record
    api_res = httpx.get(f"{backend_url}/api/tasks")
    assert not any(t["title"] == failing_title for t in api_res.json())

def test_matrix_missing_expected_result_postcondition_fails(page: Page):
    """
    Scenario 9: Missing Expected Results (Postcondition Failure)
    - Action clicks replacement control, but expected postcondition fails (UI state did not update).
    - Engine must reject recovery and report FAIL with ASSERTION_FAILED.
    - Outcome: Never marks SELF-HEALED without verified outcome.
    """
    engine = TestPhoenixEngine()

    page.set_content("""
        <!DOCTYPE html>
        <html>
        <head><title>Unresponsive UI Test</title></head>
        <body>
            <!-- Button clicks but does not update DOM -->
            <button id="btn-silent-submit" onclick="/* No-op dummy click */">
                Save Task
            </button>
            <div id="confirmation-banner" style="display:none;">Saved!</div>
        </body>
        </html>
    """)

    step = IntentStep(
        intent="Submit task form and persist",
        original_locator="#submit-task-btn", # Missing
        expected_role="button",
        expected_name="Save Task",
        action=StepAction.CLICK,
        # Postcondition checks for banner which is never shown
        postcondition=lambda p: p.locator("#confirmation-banner").is_visible(),
        postcondition_description="Confirmation banner is visible"
    )

    status = engine.execute_step(page, step, test_name="Matrix 9: Missing Expected Result")

    assert status == StepStatus.FAIL
    assert step.diagnostics.failure_category == FailureCategory.ASSERTION_FAILED
    assert step.diagnostics.postcondition_verified is False
    assert "recovery rejected" in step.diagnostics.rationale

def test_matrix_idempotency_prevention_already_succeeded(page: Page):
    """
    Scenario 10: Idempotency Prevention (Action Already Succeeded)
    - Non-idempotent action in workflow where backend verification shows task already created.
    - Engine skips duplicate action to avoid unintended side-effects.
    - Outcome: Guard prevents redundant submission, marks step cleanly.
    """
    engine = TestPhoenixEngine()

    backend_records = ["Pre-existing Task #101"]

    workflow = IntentWorkflow(
        name="Idempotent Task Creation Workflow",
        original_intent="Create task without duplicates",
        expected_outcome="Task confirmed in system",
        steps=[
            IntentStep(
                intent="Submit task creation record",
                original_locator="#submit-task-btn",
                action=StepAction.CLICK,
                is_idempotent=False # Non-idempotent action
            )
        ],
        backend_verifier=lambda: "Pre-existing Task #101" in backend_records
    )

    report = engine.execute_workflow(page, workflow)

    assert report.final_status == StepStatus.PASS
    assert "[Skipped - already verified]" in report.reconstructed_workflow[0]
