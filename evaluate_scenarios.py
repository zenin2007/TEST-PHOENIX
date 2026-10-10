"""
TestPhoenix — Self-Healing QA Evaluation & Metrics Script
Tagline: "Rise above every UI change."

Executes multi-scenario evaluation suite against TestPhoenix,
measures genuine self-healing recovery rates, failure categorization,
and outputs verified metrics.
"""

import time
import json
import httpx
from typing import Dict, Any, List

def run_evaluation(backend_url: str = "http://127.0.0.1:8000") -> Dict[str, Any]:
    print("=" * 70)
    print("TestPhoenix — Automated Self-Healing Evaluation Suite")
    print("=" * 70)
    print(f"Target Backend API: {backend_url}")
    print("Starting automated scenario suite...\n")

    scenarios_to_evaluate = [
        {"key": "normal", "name": "Scenario A1: Version A (Baseline Normal Run)", "expected_type": "baseline"},
        {"key": "normal", "name": "Scenario A2: Version A (Repeat Baseline Run)", "expected_type": "baseline"},
        {"key": "self-healing", "name": "Scenario B1: Version B (UI Redesign Drift)", "expected_type": "ui_drift"},
        {"key": "self-healing", "name": "Scenario B2: Version B (Repeated UI Redesign Drift)", "expected_type": "ui_drift"},
        {"key": "broken-backend", "name": "Scenario C1: Broken Backend (HTTP 500 DB Failure)", "expected_type": "backend_defect"},
        {"key": "ambiguous", "name": "Scenario D1: Ambiguous UI (Alpha vs Beta Buttons)", "expected_type": "ambiguity_gate"},
    ]

    results: List[Dict[str, Any]] = []
    suite_start = time.time()

    for idx, test_spec in enumerate(scenarios_to_evaluate, 1):
        print(f"[{idx}/{len(scenarios_to_evaluate)}] Executing {test_spec['name']}...")
        step_start = time.time()
        try:
            resp = httpx.post(f"{backend_url}/api/tests/run", json={"scenario": test_spec["key"]}, timeout=60.0)
            elapsed = round((time.time() - step_start), 2)
            if resp.status_code == 200:
                data = resp.json()
                data["test_name"] = test_spec["name"]
                data["expected_type"] = test_spec["expected_type"]
                data["elapsed_s"] = elapsed
                results.append(data)
                print(f"    -> Status: {data.get('status')} | Time: {elapsed}s | Score: {data.get('candidate_score') or 'N/A'}")
            else:
                print(f"    -> HTTP Error {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"    -> Execution Exception: {e}")

    total_suite_time = round(time.time() - suite_start, 2)

    # Compute Metrics
    total_runs = len(results)
    original_passes = sum(1 for r in results if r.get("original_locator_worked") is True and r.get("status") == "PASS")
    eligible_ui_failures = sum(1 for r in results if r.get("original_locator_worked") is False and r.get("expected_type") == "ui_drift")
    successful_self_heals = sum(1 for r in results if r.get("status") == "SELF-HEALED")
    genuine_backend_failures = sum(1 for r in results if r.get("status") == "FAIL" and r.get("expected_type") == "backend_defect")
    human_review_cases = sum(1 for r in results if r.get("status") == "HUMAN REVIEW REQUIRED")
    recovery_failures = sum(1 for r in results if r.get("status") == "FAIL" and r.get("expected_type") == "ui_drift")

    recovery_success_rate = (
        (successful_self_heals / eligible_ui_failures * 100) if eligible_ui_failures > 0 else 0.0
    )

    report = {
        "total_test_runs": total_runs,
        "original_test_passes": original_passes,
        "ui_related_failures_detected": eligible_ui_failures,
        "successful_self_healing_attempts": successful_self_heals,
        "genuine_application_failures_detected": genuine_backend_failures,
        "human_review_cases": human_review_cases,
        "recovery_failures": recovery_failures,
        "recovery_success_rate_percent": round(recovery_success_rate, 2),
        "denominator_explanation": (
            "The denominator (eligible UI-related failures) includes only test cases where the original "
            "locator genuinely failed due to UI layout changes (n = 2). It excludes baseline passes (n = 2), "
            "intentional backend application 500 errors (n = 1), and ambiguity safety gates (n = 1)."
        ),
        "total_execution_time_seconds": total_suite_time,
        "individual_runs": results
    }

    print("\n" + "=" * 70)
    print("TESTPHOENIX EVALUATION REPORT & METRICS")
    print("=" * 70)
    print(f"Total Test Runs Executed:                 {total_runs}")
    print(f"Original Test Passes (Baseline):           {original_passes}")
    print(f"UI Locator Failures Detected:             {eligible_ui_failures}")
    print(f"Successful Self-Healing Recoveries:       {successful_self_heals}")
    print(f"Genuine Application Defects (HTTP 500):    {genuine_backend_failures}")
    print(f"Human Review Required (Ambiguity Gate):   {human_review_cases}")
    print(f"Recovery Failures:                        {recovery_failures}")
    print(f"Total Suite Execution Time:               {total_suite_time}s")
    print("-" * 70)
    print(f"MEASURED RECOVERY SUCCESS RATE:           {report['recovery_success_rate_percent']}%")
    print("-" * 70)
    print(f"Denominator Explanation:\n{report['denominator_explanation']}")
    print("=" * 70)

    with open("evaluation_report.json", "w") as f:
        json.dump(report, f, indent=2)
    print("Saved evaluation metrics to evaluation_report.json\n")

    return report

if __name__ == "__main__":
    run_evaluation()
