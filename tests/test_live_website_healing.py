import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.test_runner import execute_live_website_test
from backend.database import get_test_runs

client = TestClient(app)

def test_demo_acceptance_version_a_passed(test_environment):
    """
    Acceptance Test - Version A:
    Canonical button 'Checkout' (#checkout-btn) is present.
    Intent: 'Proceed to checkout.'
    Expected outcome: 'Checkout/payment page is displayed.'
    Result MUST be PASSED.
    """
    base_url = test_environment["backend_url"]
    target_url = f"{base_url}/demo/checkout?version=a"

    result = execute_live_website_test(
        website_url=target_url,
        test_name="Demo Acceptance Test - Version A",
        intent="Proceed to checkout.",
        expected_outcome="Checkout/payment page is displayed."
    )

    assert result["status"] == "PASSED"
    assert result["self_healed_count"] == 0
    assert len(result["actions"]) >= 1
    action = result["actions"][0]
    assert action["original_locator_worked"] is True
    assert action["execution_result"] == "PASS"
    assert action["verification_result"] in ("VERIFIED", "SATISFIED")
    assert result["screenshot_base64"] is not None
    assert "PASSED" in (result["verification_evidence"] or "")

    # Check persistence
    runs = get_test_runs(limit=10)
    matching = [r for r in runs if "Demo Acceptance Test - Version A" in r["scenario"]]
    assert len(matching) >= 1
    assert matching[0]["status"] in ("PASSED", "PASS")


def test_demo_acceptance_version_b_self_healed(test_environment):
    """
    Acceptance Test - Version B:
    UI drift occurred: '#checkout-btn' renamed/relocated to '#proceed-to-payment-btn'.
    Intent: 'Proceed to checkout.'
    Expected outcome: 'Checkout/payment page is displayed.'
    
    TestPhoenix MUST:
    1. Detect failure of original canonical locator (#checkout-btn)
    2. Inspect live DOM
    3. Generate and score candidates (5-factor model)
    4. Apply safety gates (confidence >= 0.75, margin >= 0.15)
    5. Select '#proceed-to-payment-btn'
    6. Replay click
    7. Verify outcome (#checkout-confirmation visible)
    8. Mark result as SELF_HEALED
    """
    base_url = test_environment["backend_url"]
    target_url = f"{base_url}/demo/checkout?version=b"

    result = execute_live_website_test(
        website_url=target_url,
        test_name="Demo Acceptance Test - Version B",
        intent="Proceed to checkout.",
        expected_outcome="Checkout/payment page is displayed."
    )

    assert result["status"] == "SELF_HEALED"
    assert result["self_healed_count"] == 1
    assert len(result["actions"]) >= 1
    action = result["actions"][0]
    
    # Verify original locator failed and replacement was discovered
    assert action["original_locator_worked"] is False
    assert action["recovered_action"] == "#proceed-to-payment-btn"
    assert action["score"] is not None and action["score"] >= 0.75
    assert action["safety_decision"] == "PASS"
    assert action["execution_result"] in ("SELF_HEALED", "SELF-HEALED")
    assert action["verification_result"] == "VERIFIED"
    assert action["score_breakdown"] is not None
    assert action["score_breakdown"]["semantic"] > 0
    assert len(action["candidates"]) > 0

    # Verify screenshot and evidence
    assert result["screenshot_base64"] is not None
    assert "SELF-HEALED" in (result["verification_evidence"] or "")

    # Check persistence in SQLite
    runs = get_test_runs(limit=10)
    matching = [r for r in runs if "Demo Acceptance Test - Version B" in r["scenario"]]
    assert len(matching) >= 1
    assert matching[0]["status"] in ("SELF_HEALED", "HEALED")
    assert matching[0]["replacement_selector"] == "#proceed-to-payment-btn"


def test_demo_acceptance_version_broken_genuine_failure(test_environment):
    """
    Acceptance Test - Genuine Backend Failure:
    The server/page triggers a genuine backend failure (simulated HTTP 500).
    TestPhoenix MUST NOT convert this into SELF_HEALED.
    Status MUST be GENUINE_FAILURE.
    """
    base_url = test_environment["backend_url"]
    target_url = f"{base_url}/demo/checkout?version=broken"

    result = execute_live_website_test(
        website_url=target_url,
        test_name="Demo Acceptance Test - Broken Backend",
        intent="Proceed to checkout.",
        expected_outcome="Checkout/payment page is displayed."
    )

    assert result["status"] == "GENUINE_FAILURE"
    assert result["self_healed_count"] == 0
    assert any("500" in (ev.get("error") or ev.get("evidence") or "") for ev in result["events"] if ev.get("error") or ev.get("evidence")) or "500" in (result.get("error") or "")


def test_demo_acceptance_version_ambiguous_human_review(test_environment):
    """
    Acceptance Test - Ambiguous Candidates:
    Multiple conflicting candidates with identical or near-identical scores.
    Safety gate margin threshold (< 0.15) MUST trigger HUMAN_REVIEW_REQUIRED.
    """
    base_url = test_environment["backend_url"]
    target_url = f"{base_url}/demo/checkout?version=ambiguous"

    result = execute_live_website_test(
        website_url=target_url,
        test_name="Demo Acceptance Test - Ambiguous UI",
        intent="Proceed to checkout.",
        expected_outcome="Checkout/payment page is displayed."
    )

    assert result["status"] == "HUMAN_REVIEW_REQUIRED"
    assert result["self_healed_count"] == 0
    action = result["actions"][0]
    assert action["safety_decision"] == "HUMAN_REVIEW_REQUIRED"
    assert "ambiguous" in (result["verification_evidence"] or "").lower() or "human review" in (result["verification_evidence"] or "").lower()


def test_demo_api_endpoint_execution(test_environment):
    """
    Tests live test execution via the FastAPI HTTP endpoint (/api/tests/live).
    """
    base_url = test_environment["backend_url"]
    target_url = f"{base_url}/demo/checkout?version=b"

    resp = client.post("/api/tests/live", json={
        "test_name": "API Live Test Endpoint - Version B",
        "website_url": target_url,
        "intent": "Proceed to checkout.",
        "expected_outcome": "Checkout/payment page is displayed."
    })

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "SELF_HEALED"
    assert data["self_healed_count"] == 1
    assert len(data["actions"]) >= 1
    assert data["actions"][0]["recovered_action"] == "#proceed-to-payment-btn"
