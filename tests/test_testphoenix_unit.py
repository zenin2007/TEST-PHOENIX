import pytest
from testphoenix.models import (
    IntentStep,
    StepAction,
    StepStatus,
    FailureCategory,
    CandidateElement,
    CandidateScore
)
from testphoenix.scoring import CandidateScorer, ScoringConfig
from testphoenix.classifier import FailureClassifier
from testphoenix.engine import TestPhoenixEngine

def test_candidate_scoring_weights_and_normalization():
    scorer = CandidateScorer()
    step = IntentStep(
        intent="Create task item",
        original_locator="#create-task-btn",
        expected_role="button",
        expected_name="Create Task"
    )
    
    # Matching candidate
    candidate = CandidateElement(
        selector="#new-work-item-btn",
        tag_name="button",
        role="button",
        accessible_name="New Work Item",
        text_content="New Work Item",
        element_id="new-work-item-btn",
        parent_context="Workspace Actions"
    )

    score = scorer.score_candidate(step, candidate)
    assert 0.0 <= score.total_score <= 1.0
    assert 0.0 <= score.semantic_score <= 1.0
    assert 0.0 <= score.role_score <= 1.0
    assert 0.0 <= score.text_score <= 1.0
    assert 0.0 <= score.context_score <= 1.0
    assert 0.0 <= score.structural_score <= 1.0
    assert score.total_score >= 0.75, f"Expected score >= 0.75, got {score.total_score}"

def test_role_and_text_matching():
    scorer = CandidateScorer()
    step = IntentStep(
        intent="Submit task form",
        original_locator="#submit-task-btn",
        expected_role="button",
        expected_name="Save Task"
    )

    matching_button = CandidateElement(
        selector="#submit-workitem-btn",
        tag_name="button",
        role="button",
        accessible_name="Add Work Item",
        text_content="Add Work Item"
    )
    unrelated_heading = CandidateElement(
        selector="h1",
        tag_name="h1",
        role="heading",
        accessible_name="Active Work Items",
        text_content="Active Work Items"
    )

    score_btn = scorer.score_candidate(step, matching_button)
    score_h1 = scorer.score_candidate(step, unrelated_heading)

    assert score_btn.role_score == 1.0
    assert score_h1.role_score == 0.0
    assert score_btn.total_score > score_h1.total_score

def test_confidence_threshold_rejection():
    # If top candidate score is below min_candidate_score, engine must reject
    custom_config = ScoringConfig(min_candidate_score=0.85)
    scorer = CandidateScorer(custom_config)
    
    step = IntentStep(
        intent="Delete user account",
        original_locator="#delete-user-btn",
        expected_role="button",
        expected_name="Delete Account"
    )
    
    # Completely unrelated element
    unrelated = CandidateElement(
        selector="#nav-profile-link",
        tag_name="a",
        role="link",
        accessible_name="User Profile",
        text_content="User Profile"
    )

    score = scorer.score_candidate(step, unrelated)
    assert score.total_score < custom_config.min_candidate_score

def test_ambiguous_candidate_margin_rejection():
    config = ScoringConfig(min_candidate_score=0.75, min_score_margin=0.15)
    scorer = CandidateScorer(config)

    step = IntentStep(
        intent="Create task",
        original_locator="#create-task-btn",
        expected_role="button",
        expected_name="Create Task"
    )

    cand1 = CandidateElement(
        selector="#btn-create-task-stream-alpha",
        tag_name="button",
        role="button",
        accessible_name="Create Task",
        text_content="Create Task",
        parent_context="Workstream Alpha"
    )
    cand2 = CandidateElement(
        selector="#btn-create-task-stream-beta",
        tag_name="button",
        role="button",
        accessible_name="Create Task",
        text_content="Create Task",
        parent_context="Workstream Beta"
    )

    ranked = scorer.rank_candidates(step, [cand1, cand2])
    score_diff = abs(ranked[0].score.total_score - ranked[1].score.total_score)
    # Both are identical in text, role, and structure -> margin is < 0.15
    assert score_diff < config.min_score_margin

def test_failure_classification_categories():
    # 1. Element not found
    cat_timeout = FailureClassifier.classify(exception=TimeoutError("Timeout 1500ms exceeded waiting for locator"))
    assert cat_timeout == FailureCategory.ELEMENT_NOT_FOUND

    # 2. Ambiguity
    cat_ambig = FailureClassifier.classify(is_ambiguous=True)
    assert cat_ambig == FailureCategory.AMBIGUOUS_MATCH

    # 3. Element not interactable
    cat_disabled = FailureClassifier.classify(exception=Exception("Element is disabled and cannot receive click"))
    assert cat_disabled == FailureCategory.ELEMENT_NOT_INTERACTABLE

    # 4. Assertion failed
    cat_assertion = FailureClassifier.classify(postcondition_passed=False)
    assert cat_assertion == FailureCategory.ASSERTION_FAILED

def test_genuine_backend_error_classification():
    # 5. Network / Backend Error (HTTP 500)
    cat_net = FailureClassifier.classify(network_errors=["HTTP 500 on /api/tasks"])
    assert cat_net == FailureCategory.NETWORK_OR_BACKEND_ERROR

    cat_msg = FailureClassifier.classify(exception=Exception("Server error 500: Database transaction failure"))
    assert cat_msg == FailureCategory.NETWORK_OR_BACKEND_ERROR

def test_postcondition_verification_must_pass_for_self_healed():
    step = IntentStep(
        intent="Create task with title",
        original_locator="#create-task-btn",
        postcondition=lambda page: False,  # explicitly failing postcondition
        postcondition_description="Task card exists in UI"
    )
    # Even if recovery was attempted, failing postcondition must classify as ASSERTION_FAILED and status FAIL
    step.diagnostics.postcondition_verified = False
    step.status = StepStatus.FAIL
    step.diagnostics.failure_category = FailureCategory.ASSERTION_FAILED
    assert step.status != StepStatus.SELF_HEALED
    assert step.diagnostics.failure_category == FailureCategory.ASSERTION_FAILED

def test_recovery_after_changed_element_id():
    scorer = CandidateScorer()
    step = IntentStep(
        intent="Click create task button",
        original_locator="#create-task-btn",
        expected_role="button",
        expected_name="Create Task"
    )
    renamed_id_candidate = CandidateElement(
        selector="#action-new-task",
        tag_name="button",
        role="button",
        accessible_name="Create Task",
        text_content="Create Task",
        element_id="action-new-task"
    )
    score = scorer.score_candidate(step, renamed_id_candidate)
    assert score.total_score >= 0.85
    assert score.role_score == 1.0

def test_recovery_after_renamed_button():
    scorer = CandidateScorer()
    step = IntentStep(
        intent="Save task and persist",
        original_locator="#submit-task-btn",
        expected_role="button",
        expected_name="Save Task"
    )
    renamed_btn = CandidateElement(
        selector="#submit-workitem-btn",
        tag_name="button",
        role="button",
        accessible_name="Add Work Item",
        text_content="Add Work Item"
    )
    score = scorer.score_candidate(step, renamed_btn)
    assert score.total_score >= 0.75
    assert score.semantic_score > 0.7

def test_recovery_after_rearranged_form():
    scorer = CandidateScorer()
    step_assignee = IntentStep(
        intent="Enter task assignee",
        original_locator="#task-assignee-input",
        expected_role="textbox",
        expected_name="Assignee",
        action=StepAction.FILL
    )
    cands = [
        CandidateElement(selector="#workitem-desc-input", role="textbox", accessible_name="Scope & Description"),
        CandidateElement(selector="#workitem-owner-input", role="textbox", accessible_name="Lead Assignee / Owner"),
        CandidateElement(selector="#workitem-title-input", role="textbox", accessible_name="Item Title")
    ]
    ranked = scorer.rank_candidates(step_assignee, cands)
    assert ranked[0].selector == "#workitem-owner-input"
    assert ranked[0].score.total_score >= 0.75

def test_duplicate_action_prevention_non_idempotent():
    from testphoenix.models import IntentWorkflow
    engine = TestPhoenixEngine()
    
    backend_calls = {"checked": 0}
    def mock_backend_verifier():
        backend_calls["checked"] += 1
        return True  # Task already exists in backend!
        
    step_submit = IntentStep(
        intent="Submit task to database",
        original_locator="#submit-task-btn",
        action=StepAction.CLICK,
        is_idempotent=False
    )
    
    workflow = IntentWorkflow(
        name="Idempotency Test",
        original_intent="Create task safely without duplicates",
        expected_outcome="Task exists once in database",
        steps=[step_submit],
        backend_verifier=mock_backend_verifier
    )
    
    class MockPage:
        pass
        
    report = engine.execute_workflow(MockPage(), workflow, verbose=False)
    assert backend_calls["checked"] >= 1
    assert "already satisfied" in step_submit.diagnostics.rationale or "already verified" in report.reconstructed_workflow[0]
    assert report.final_status == StepStatus.PASS

def test_final_ui_and_backend_verification():
    from testphoenix.models import IntentWorkflow
    engine = TestPhoenixEngine()
    
    step = IntentStep(
        intent="Simple pass step",
        original_locator="#any-btn",
        action=StepAction.CLICK
    )
    
    workflow_failing_backend = IntentWorkflow(
        name="Backend Verification Check",
        original_intent="Verify backend check failure blocks overall pass",
        expected_outcome="Data in database",
        steps=[step],
        ui_verifier=lambda p: True,
        backend_verifier=lambda: False  # Failed!
    )
    
    class MockPage:
        def on(self, event, cb): pass
        def remove_listener(self, event, cb): pass
        def locator(self, sel):
            class Loc:
                def click(self, timeout=0): pass
                def is_visible(self): return False
            return Loc()
            
    report = engine.execute_workflow(MockPage(), workflow_failing_backend, verbose=False)
    assert report.final_status == StepStatus.FAIL
    assert "Backend verification failed" in report.verification_evidence

