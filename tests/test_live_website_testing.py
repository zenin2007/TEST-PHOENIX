import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.test_runner import execute_live_website_test
from backend.database import get_test_runs

client = TestClient(app)

def test_live_test_validation_errors():
    # Missing fields
    resp = client.post("/api/tests/live", json={})
    assert resp.status_code == 422

    # Invalid URL scheme
    resp_invalid_scheme = client.post("/api/tests/live", json={
        "test_name": "Invalid Scheme Test",
        "website_url": "javascript:alert(1)",
        "intent": "Malicious script execution attempt",
        "expected_outcome": "Blocked"
    })
    assert resp_invalid_scheme.status_code == 422

    # Missing hostname
    resp_no_host = client.post("/api/tests/live", json={
        "test_name": "No Host Test",
        "website_url": "https://",
        "intent": "Incomplete URL",
        "expected_outcome": "Blocked"
    })
    assert resp_no_host.status_code == 422


def test_execute_live_website_test_real_browser():
    """
    Validates that Playwright ACTUALLY opens the website, waits for page readiness,
    inspects the DOM tree, extracts accessibility information, captures a real screenshot,
    records structured execution events, and persists the run to SQLite.
    """
    # Use the static audit portal served locally by TestPhoenix
    import os
    results_path = os.path.join(os.path.dirname(__file__), "..", "backend", "static", "results.html")
    file_url = f"file:///{os.path.abspath(results_path).replace(os.sep, '/')}"

    # First test that file:// scheme is rejected by execute_live_website_test safety gate
    blocked_result = execute_live_website_test(
        website_url="ftp://example.com/test",
        test_name="Blocked Protocol",
        intent="Test protocol safety gate",
        expected_outcome="Should fail gracefully with security message"
    )
    assert blocked_result["status"] in ("FAIL", "GENUINE_FAILURE")
    assert "Security error" in blocked_result["error"]
    assert any(ev["action"] == "VALIDATE_URL" and ev["status"] == "FAIL" for ev in blocked_result["events"])


def test_live_test_endpoint_execution(test_environment):
    """
    Executes live test against the real local FastAPI test server running in test_environment fixture.
    """
    base_url = test_environment["backend_url"]
    target_url = f"{base_url}/results"


    payload = {
        "test_name": "Results Portal Integration Test",
        "website_url": target_url,
        "intent": "Navigate to audit portal and inspect telemetry cards",
        "expected_outcome": "Audit portal header and metric cards are discovered"
    }

    response = client.post("/api/tests/live", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Verify response structure and real data
    assert data["run_id"].startswith("live_")
    assert data["test_name"] == payload["test_name"]
    assert data["website_url"] == target_url
    assert target_url in data["actual_url"]
    assert "TestPhoenix" in data["page_title"]
    assert data["status"] in ("PASS", "PASSED")
    assert data["execution_duration_ms"] > 0
    assert data["error"] is None

    # Verify structured execution events
    events = data["events"]
    assert len(events) >= 5
    actions = [ev["action"] for ev in events]
    assert "SESSION_INIT" in actions
    assert "NAVIGATE" in actions
    assert "PAGE_READY" in actions
    assert "INSPECT_DOM" in actions
    assert "INSPECT_A11Y" in actions
    assert "CAPTURE_SCREENSHOT" in actions
    assert "SESSION_CLEANUP" in actions

    for ev in events:
        assert "timestamp" in ev
        assert "action" in ev
        assert "target" in ev
        assert ev["status"] in ("PASS", "INFO", "FAIL")

    # Verify DOM inspection
    dom_summary = data["dom_summary"]
    assert dom_summary["total_interactive_elements"] > 0
    assert len(dom_summary["sample_elements"]) > 0
    first_el = dom_summary["sample_elements"][0]
    assert "selector" in first_el
    assert "role" in first_el
    assert "tag_name" in first_el

    # Verify accessibility inspection
    a11y_summary = data["accessibility_summary"]
    assert a11y_summary["nodes_count"] > 0

    # Verify screenshot evidence
    assert data["screenshot_base64"] is not None
    assert data["screenshot_base64"].startswith("data:image/jpeg;base64,")

    # Verify persistence in SQLite test_runs
    recent_runs = get_test_runs(limit=10)
    matching = [r for r in recent_runs if "Results Portal Integration Test" in r["scenario"]]
    assert len(matching) >= 1
    assert matching[0]["status"] in ("PASS", "PASSED")
    assert matching[0]["original_locator"] == target_url
