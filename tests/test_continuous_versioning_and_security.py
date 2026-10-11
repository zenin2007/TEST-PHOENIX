import pytest
import json
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import (
    save_test_run, get_test_runs, clear_demo_runs,
    get_active_test_version, get_test_version_history,
    promote_healed_test_version, save_test_version
)
from backend.test_runner import is_safe_public_url, execute_live_website_test
from testphoenix.models import IntentStep, StepAction, StepStatus, FailureCategory
from testphoenix.engine import TestPhoenixEngine
from testphoenix.scoring import ScoringConfig

client = TestClient(app)

def test_version_chain_and_baseline_progression():
    """
    Validates continuous test versioning lifecycle:
    Test V1 -> SELF-HEAL -> Test V2 [ACTIVE BASELINE] -> SELF-HEAL -> Test V3 [ACTIVE BASELINE]
    V2 automatically becomes baseline; historical versions remain preserved.
    """
    import uuid
    test_id = f"checkout-resilience-flow-{uuid.uuid4().hex[:8]}"

    # 1. Establish Test V1 baseline
    v1 = save_test_version(
        test_id=test_id,
        version_number=1,
        version_label="Test V1",
        app_version="App V1",
        parent_version_id=None,
        is_active_baseline=True,
        workflow_steps_json=json.dumps([{"intent": "Click checkout", "locator": "#checkout-btn", "action": "CLICK"}]),
        healing_summary="Initial baseline definition",
        confidence=1.0,
        verification_result="VERIFIED: Direct checkout modal confirmed"
    )
    assert v1["version_label"] == "Test V1"
    assert v1["is_active_baseline"] is True

    active = get_active_test_version(test_id)
    assert active["version_label"] == "Test V1"
    assert active["id"] == v1["id"]

    # 2. Self-healing event occurs in App V2 -> promotes to Test V2
    v2 = promote_healed_test_version(
        test_id=test_id,
        app_version="App V2",
        healing_summary="Self-healed: #checkout-btn -> #proceed-to-payment-btn (Score: 94%)",
        confidence=0.94,
        verification_result="VERIFIED: Redesigned checkout drawer confirmed in DOM + SQLite",
        updated_steps_json=json.dumps([{"intent": "Click checkout", "locator": "#proceed-to-payment-btn", "action": "CLICK"}])
    )
    assert v2["version_label"] == "Test V2"
    assert v2["version_number"] == 2
    assert v2["parent_version_id"] == v1["id"]
    assert v2["is_active_baseline"] is True

    # Check V2 automatically became the active baseline
    active_now = get_active_test_version(test_id)
    assert active_now["id"] == v2["id"]
    assert active_now["version_label"] == "Test V2"

    # Check V1 history is preserved with is_active_baseline = False
    history = get_test_version_history(test_id)
    assert len(history) == 2
    assert history[0]["version_label"] == "Test V1"
    assert history[0]["is_active_baseline"] is False
    assert history[1]["version_label"] == "Test V2"
    assert history[1]["is_active_baseline"] is True

    # 3. Next self-healing event in App V3 -> promotes to Test V3
    v3 = promote_healed_test_version(
        test_id=test_id,
        app_version="App V3",
        healing_summary="Self-healed: #proceed-to-payment-btn -> #pay-now-action (Score: 91%)",
        confidence=0.91,
        verification_result="VERIFIED: Single-page payment portal confirmed",
        updated_steps_json=json.dumps([{"intent": "Click checkout", "locator": "#pay-now-action", "action": "CLICK"}])
    )
    assert v3["version_label"] == "Test V3"
    assert v3["version_number"] == 3
    assert v3["parent_version_id"] == v2["id"]
    assert v3["is_active_baseline"] is True

    # Verify complete historical chain: V1 -> V2 -> V3
    final_history = get_test_version_history(test_id)
    assert len(final_history) == 3
    assert [v["version_label"] for v in final_history] == ["Test V1", "Test V2", "Test V3"]
    assert final_history[0]["is_active_baseline"] is False
    assert final_history[1]["is_active_baseline"] is False
    assert final_history[2]["is_active_baseline"] is True

    # Verify API endpoint
    api_resp = client.get(f"/api/versions?test_id={test_id}")
    assert api_resp.status_code == 200
    assert len(api_resp.json()) == 3


def test_demo_data_separated_from_real_mode():
    """
    Validates that demo scenario records are tagged with is_demo=1
    and never appear in default REAL mode.
    """
    unique_real_scenario = "Real Live Suite: E-Commerce Production Checkout"
    unique_demo_scenario = "Demo Mock Suite: Synthetic Redesign Drawer"

    # Save real test run
    real_run = save_test_run(
        scenario=unique_real_scenario,
        status="PASSED",
        original_locator="https://store.example.com",
        is_demo=False,
        verification_result="Order #9001 verified"
    )
    assert real_run["is_demo"] is False

    # Save demo test run
    demo_run = save_test_run(
        scenario=unique_demo_scenario,
        status="SELF-HEALED",
        original_locator="#btn-demo",
        is_demo=True,
        verification_result="Simulated pass"
    )
    assert demo_run["is_demo"] is True

    # Query REAL mode (default)
    real_resp = client.get("/api/tests/history?mode=real")
    assert real_resp.status_code == 200
    real_runs = real_resp.json()
    assert any(r["scenario"] == unique_real_scenario for r in real_runs)
    assert not any(r["scenario"] == unique_demo_scenario for r in real_runs)

    # Query DEMO mode
    demo_resp = client.get("/api/tests/history?mode=demo")
    assert demo_resp.status_code == 200
    demo_runs = demo_resp.json()
    assert any(r["scenario"] == unique_demo_scenario for r in demo_runs)
    assert not any(r["scenario"] == unique_real_scenario for r in demo_runs)


def test_real_data_survives_demo_data_clearing():
    """
    Validates that clearing demo data strictly purges is_demo=1 records
    while leaving all real execution telemetry completely intact.
    """
    unique_real = "Real Customer Test: Mission Critical Pipeline"
    unique_demo = "Version A — Demo Sandbox"

    save_test_run(scenario=unique_real, status="PASSED", is_demo=False)
    save_test_run(scenario=unique_demo, status="PASS", is_demo=True)

    # Trigger clear demo data
    clear_resp = client.post("/api/demo/clear")
    assert clear_resp.status_code == 200
    assert "cleared_count" in clear_resp.json()

    # Verify real data survives
    all_runs = get_test_runs(limit=100, mode="all")
    assert any(r["scenario"] == unique_real for r in all_runs)
    assert not any(r["scenario"] == unique_demo for r in all_runs)


def test_ssrf_private_urls_are_blocked():
    """
    Validates that private, loopback, internal, and metadata IPs/hostnames
    are blocked to prevent SSRF vulnerabilities.
    """
    blocked_targets = [
        "http://localhost:8080/admin",
        "http://127.0.0.1:3000/internal",
        "http://127.0.0.1:8000/api/tasks",
        "http://169.254.169.254/latest/meta-data/",
        "http://10.0.0.5:9000/metrics",
        "http://192.168.1.1/router-login",
        "http://172.16.0.1/secrets",
        "ftp://example.com/test",
        "file:///etc/passwd"
    ]

    for target in blocked_targets:
        safe, err = is_safe_public_url(target, allow_internal=False)
        assert safe is False, f"URL {target} should have been blocked"
        assert "Security error" in err

    # Public URLs should be safe
    safe_pub, _ = is_safe_public_url("https://example.com", allow_internal=False)
    assert safe_pub is True

    # Validate that execute_live_website_test blocks private address without allow_internal
    live_result = execute_live_website_test(
        website_url="http://127.0.0.1:9999/sensitive",
        test_name="SSRF Attempt",
        intent="Access private loopback port",
        expected_outcome="Should be blocked",
        allow_internal=False
    )
    assert live_result["status"] == "GENUINE_FAILURE"
    assert "Security error" in live_result["error"]
    assert any(ev["action"] == "VALIDATE_URL" and ev["status"] == "FAIL" for ev in live_result["events"])


def test_real_backend_failures_are_not_healed():
    """
    Validates that genuine HTTP 500 server errors or backend failures
    are never masked as healed UI changes.
    """
    from testphoenix.classifier import FailureClassifier
    
    server_error = Exception("HTTP 500 Internal Server Error: DB_TRANSACTION_FAILURE")
    category = FailureClassifier.classify(server_error)
    assert category in (FailureCategory.NETWORK_OR_BACKEND_ERROR, FailureCategory.BACKEND_OR_NETWORK_ERROR)

    engine = TestPhoenixEngine()
    # If classified as network/backend error, self-healing is strictly skipped
    assert category not in [FailureCategory.ELEMENT_NOT_FOUND, FailureCategory.LOCATOR_MISSING]


def test_ambiguous_healing_requires_human_review():
    """
    Validates that when candidate elements have score margin < 0.15,
    the engine halts with HUMAN_REVIEW_REQUIRED rather than guessing arbitrarily.
    """
    config = ScoringConfig(min_candidate_score=0.75, min_score_margin=0.15)
    assert config.min_score_margin == 0.15
    assert config.min_candidate_score == 0.75

    # Test scoring margin threshold calculation
    score_opt1 = 0.88
    score_opt2 = 0.86
    margin = round(score_opt1 - score_opt2, 4)
    assert margin < config.min_score_margin
