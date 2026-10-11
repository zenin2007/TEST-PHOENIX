import json
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.test_runner import execute_checkout_golden_workflow
from backend.database import (
    get_active_test_version,
    get_test_version_history,
    get_test_runs,
    get_all_orders,
    get_connection
)
from testphoenix.models import StepStatus

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def clean_golden_flow_versions_module():
    """Ensures golden-checkout-flow starts from a pristine V1 baseline for the module suite."""
    conn = get_connection()
    try:
        conn.execute("DELETE FROM test_versions WHERE test_id = 'golden-checkout-flow'")
        conn.commit()
    finally:
        conn.close()


def test_golden_workflow_v1_baseline_pass(test_environment):
    """
    Validates Application V1 -> Test V1 baseline execution.
    Original canonical checkout button (#checkout-btn) succeeds directly.
    Establishes Test V1 active baseline.
    """
    backend_url = test_environment["backend_url"]
    
    run_v1 = execute_checkout_golden_workflow(
        version="v1",
        backend_url=backend_url
    )

    assert run_v1["status"] == "PASS"
    assert run_v1["is_demo"] is True
    assert run_v1["app_version"] == "App V1"
    assert run_v1["test_version_label"] == "Test V1"
    assert run_v1["original_locator"] == "#checkout-btn"
    assert run_v1["original_locator_worked"] is True
    assert "VERIFIED" in run_v1["verification_result"]

    # Verify active baseline is Test V1
    active = get_active_test_version("golden-checkout-flow")
    assert active is not None
    assert active["version_label"] == "Test V1"
    assert active["is_active_baseline"] is True

    # Verify order recorded in SQLite
    orders = get_all_orders()
    assert any("Audio Wireless Headphones" in o["product_name"] for o in orders)


def test_golden_workflow_v1_to_v2_recovery_and_promotion(test_environment):
    """
    Validates Application V2 UI Mutation:
    - Button redesigned and moved to drawer (#pay-now-btn).
    - Baseline Test V1 fails on #checkout-btn.
    - TestPhoenix detects change, evaluates candidates via 5-factor scoring.
    - Self-heals to #pay-now-btn and verifies business outcome.
    - Automatically promotes to Test V2 [ACTIVE BASELINE].
    - Preserves Test V1 in history.
    """
    backend_url = test_environment["backend_url"]

    run_v2 = execute_checkout_golden_workflow(
        version="v2",
        backend_url=backend_url
    )

    assert run_v2["status"] == "SELF-HEALED"
    assert run_v2["is_demo"] is True
    assert run_v2["app_version"] == "App V2"
    assert run_v2["test_version_label"] == "Test V2"
    assert run_v2["original_locator_worked"] is False
    assert run_v2["replacement_selector"] == "#pay-now-btn"
    assert run_v2["candidate_score"] >= 0.75
    assert "SELF-HEALED" in run_v2["verification_result"]

    # Verify active baseline is now Test V2
    active = get_active_test_version("golden-checkout-flow")
    assert active is not None
    assert active["version_label"] == "Test V2"
    assert active["is_active_baseline"] is True

    # Verify historical Test V1 remains preserved
    history = get_test_version_history("golden-checkout-flow")
    assert len(history) >= 2
    v1_record = [v for v in history if v["version_number"] == 1][0]
    assert v1_record["version_label"] == "Test V1"
    assert v1_record["is_active_baseline"] is False  # retired as active, preserved in history


def test_golden_workflow_v2_to_v3_recovery_and_promotion(test_environment):
    """
    Validates Application V3 Second UI Mutation:
    - Mutated to multi-step container (#confirm-and-pay-btn).
    - Active baseline Test V2 fails on #pay-now-btn.
    - TestPhoenix self-heals using current page context and 5-factor scoring.
    - Verifies outcome and promotes to Test V3 [ACTIVE BASELINE].
    - Historical versions Test V1 and Test V2 remain preserved.
    """
    backend_url = test_environment["backend_url"]

    run_v3 = execute_checkout_golden_workflow(
        version="v3",
        backend_url=backend_url
    )

    assert run_v3["status"] == "SELF-HEALED"
    assert run_v3["is_demo"] is True
    assert run_v3["app_version"] == "App V3"
    assert run_v3["test_version_label"] == "Test V3"
    assert run_v3["original_locator_worked"] is False
    assert run_v3["replacement_selector"] == "#confirm-and-pay-btn"
    assert run_v3["candidate_score"] >= 0.75

    # Verify active baseline is now Test V3
    active = get_active_test_version("golden-checkout-flow")
    assert active is not None
    assert active["version_label"] == "Test V3"
    assert active["is_active_baseline"] is True

    # Verify full version chain preservation (V1, V2, V3)
    history = get_test_version_history("golden-checkout-flow")
    version_numbers = [v["version_number"] for v in history]
    assert 1 in version_numbers
    assert 2 in version_numbers
    assert 3 in version_numbers


def test_controlled_ui_mutations_recovery(test_environment):
    """
    Proves recovery across all 4 controlled mutation categories:
    1. Change ID (#submit-payment-btn)
    2. Rename Text ("Authorize Card & Complete Purchase")
    3. Change Structure (nested accordion)
    4. Move Element (reordered above summary)
    """
    backend_url = test_environment["backend_url"]

    for mut in ["change-id", "rename-text", "change-structure", "move-element"]:
        res = execute_checkout_golden_workflow(
            version="v2",
            mutation=mut,
            backend_url=backend_url
        )
        assert res["status"] in ("PASS", "SELF-HEALED"), f"Failed recovery for mutation: {mut}"
        assert res["is_demo"] is True
        assert "VERIFIED" in res["verification_result"] or "SELF-HEALED" in res["verification_result"]


def test_case_b_ambiguous_target_halts_for_review(test_environment):
    """
    Case B — Ambiguous Target:
    Two competing candidate buttons (#btn-pay-1 and #btn-pay-2) have identical text and role.
    Score margin is < 0.15 threshold.
    TestPhoenix MUST halt with HUMAN REVIEW REQUIRED and never guess blindly.
    """
    backend_url = test_environment["backend_url"]

    run_ambig = execute_checkout_golden_workflow(
        version="ambiguous",
        failure_case="ambiguous",
        backend_url=backend_url
    )

    assert run_ambig["status"] == StepStatus.HUMAN_REVIEW_REQUIRED.value
    assert "HUMAN REVIEW REQUIRED" in run_ambig["verification_result"]
    assert run_ambig["is_demo"] is True


def test_case_c_backend_defect_is_not_healed(test_environment):
    """
    Case C — Real Backend Defect (HTTP 500):
    Genuine server transaction failure occurs.
    TestPhoenix MUST report genuine failure and never mask it as a successful self-healing.
    """
    backend_url = test_environment["backend_url"]

    run_defect = execute_checkout_golden_workflow(
        version="broken",
        failure_case="500",
        backend_url=backend_url
    )

    assert run_defect["status"] == "FAIL"
    assert "GENUINE FAILURE" in run_defect["verification_result"]
    assert "HTTP 500" in run_defect["verification_result"]
    assert run_defect["is_demo"] is True


def test_demo_checkout_api_endpoint(test_environment):
    """
    Validates the REST API endpoint /api/demo/checkout-run.
    """
    res = client.post("/api/demo/checkout-run?version=v1")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "PASS"
    assert data["is_demo"] is True
    assert "timeline_steps" in data
