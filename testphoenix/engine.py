import time
from typing import Optional, Callable, List
from playwright.sync_api import Page, Locator, TimeoutError as PlaywrightTimeoutError

from testphoenix.models import IntentStep, StepStatus, StepAction, FailureCategory, CandidateElement
from testphoenix.scoring import CandidateScorer, ScoringConfig
from testphoenix.classifier import FailureClassifier
from testphoenix.dom_inspector import DomInspector
from testphoenix.reporter import TestPhoenixReporter

class TestPhoenixEngine:
    """
    TestPhoenix: Intent-Aware Self-Healing Test Engine.
    Tagline: 'Rise above every UI change.'
    """
    __test__ = False

    def __init__(self, scoring_config: Optional[ScoringConfig] = None, timeout_ms: int = 1500):
        self.config = scoring_config or ScoringConfig()
        self.scorer = CandidateScorer(self.config)
        self.timeout_ms = timeout_ms

    def _perform_action(self, page: Page, locator_str: str, action: StepAction, input_data: Optional[str] = None):
        """Dispatches action on resolved locator."""
        loc = page.locator(locator_str)
        if action == StepAction.CLICK:
            loc.click(timeout=self.timeout_ms)
        elif action == StepAction.FILL:
            loc.fill(str(input_data or ""), timeout=self.timeout_ms)
        elif action == StepAction.SELECT_OPTION:
            loc.select_option(str(input_data or ""), timeout=self.timeout_ms)
        else:
            loc.click(timeout=self.timeout_ms)

    def execute_step(
        self,
        page: Page,
        step: IntentStep,
        test_name: str = "TestPhoenix Execution",
        verbose: bool = True
    ) -> StepStatus:
        """
        Executes an intent step with full self-healing, transparent candidate ranking,
        failure classification, and postcondition verification.
        """
        start_time = time.time()
        network_errors: List[str] = []

        # Monitor page responses for genuine server/backend errors (HTTP 500+)
        def on_response(response):
            if response.status >= 500:
                network_errors.append(f"HTTP {response.status} on {response.url}")

        page.on("response", on_response)

        try:
            # 1. Attempt original Playwright locator first
            try:
                self._perform_action(page, step.original_locator, step.action, step.input_data)
                
                # Check for network/backend errors that occurred during or immediately after the action
                for _ in range(15):
                    if network_errors:
                        break
                    try:
                        if page.locator("#error-alert, [data-testid='error-message']").is_visible():
                            alert_text = page.locator("#error-alert, [data-testid='error-message']").inner_text()
                            if "500" in alert_text or "error" in alert_text.lower():
                                network_errors.append(f"HTTP 500 error alert: {alert_text}")
                                break
                    except Exception:
                        pass
                    time.sleep(0.1)

                if network_errors:
                    step.diagnostics.network_errors = network_errors
                    step.diagnostics.failure_category = FailureCategory.NETWORK_OR_BACKEND_ERROR
                    step.status = StepStatus.FAIL
                    step.diagnostics.rationale = f"Genuine backend application error: {network_errors}"
                    return step.status

                # Verify postcondition
                if step.postcondition:
                    passed = False
                    try:
                        passed = step.postcondition(page)
                    except Exception as pe:
                        passed = False
                        step.diagnostics.original_error = str(pe)

                    step.diagnostics.postcondition_verified = passed
                    if passed:
                        step.status = StepStatus.PASS
                    else:
                        step.status = StepStatus.FAIL
                        step.diagnostics.failure_category = FailureCategory.ASSERTION_FAILED
                        step.diagnostics.rationale = "Original locator succeeded, but postcondition verification failed."
                else:
                    step.status = StepStatus.PASS

                return step.status

            except Exception as orig_exc:
                step.diagnostics.original_error = str(orig_exc)

                # Check if backend error occurred during execution
                if network_errors:
                    step.diagnostics.network_errors = network_errors
                    step.diagnostics.failure_category = FailureCategory.NETWORK_OR_BACKEND_ERROR
                    step.status = StepStatus.FAIL
                    step.diagnostics.rationale = f"Backend failure occurred: {network_errors}. Self-healing skipped."
                    return step.status

                # Classify the failure
                classified = FailureClassifier.classify(exception=orig_exc)
                step.diagnostics.failure_category = classified

                # If failure is not an element-not-found / timeout, do not heal
                if classified != FailureCategory.ELEMENT_NOT_FOUND:
                    step.status = StepStatus.FAIL
                    step.diagnostics.rationale = f"Non-recoverable failure category: {classified.value}."
                    return step.status

                # 2. Inspect active DOM for replacement candidates
                candidates = DomInspector.inspect(page)
                if not candidates:
                    step.status = StepStatus.FAIL
                    step.diagnostics.rationale = "No interactive candidate elements discovered on active page."
                    return step.status

                # 3. Score and rank candidates
                ranked = self.scorer.rank_candidates(step, candidates)
                step.diagnostics.candidates_evaluated = ranked

                best_candidate = ranked[0]
                best_score = best_candidate.score.total_score if best_candidate.score else 0.0

                # 4. Check minimum candidate confidence threshold
                if best_score < self.config.min_candidate_score:
                    step.status = StepStatus.FAIL
                    step.diagnostics.rationale = (
                        f"Top candidate '{best_candidate.selector}' score ({best_score:.3f}) "
                        f"is below minimum confidence threshold ({self.config.min_candidate_score})."
                    )
                    return step.status

                # 5. Check score margin over second candidate for ambiguity
                if len(ranked) > 1:
                    second_candidate = ranked[1]
                    second_score = second_candidate.score.total_score if second_candidate.score else 0.0
                    margin = round(best_score - second_score, 4)
                    step.diagnostics.score_margin = margin

                    if margin < self.config.min_score_margin:
                        # Ambiguous match detected! Request human review
                        step.status = StepStatus.HUMAN_REVIEW_REQUIRED
                        step.diagnostics.failure_category = FailureCategory.AMBIGUOUS_MATCH
                        step.diagnostics.rationale = (
                            f"Ambiguous candidates detected. Best: '{best_candidate.selector}' ({best_score:.3f}) "
                            f"vs Second: '{second_candidate.selector}' ({second_score:.3f}). "
                            f"Margin ({margin:.3f}) < required threshold ({self.config.min_score_margin}). "
                            "Human review required to avoid speculative action."
                        )
                        return step.status

                # 6. Safety checks on winning candidate
                if not best_candidate.is_visible or not best_candidate.is_enabled:
                    step.status = StepStatus.FAIL
                    step.diagnostics.failure_category = FailureCategory.ELEMENT_NOT_INTERACTABLE
                    step.diagnostics.rationale = f"Replacement candidate '{best_candidate.selector}' is not interactable."
                    return step.status

                # 7. Execute recovery action
                step.diagnostics.selected_candidate = best_candidate
                step.diagnostics.recovery_attempts += 1
                step.diagnostics.rationale = (
                    f"Healed with '{best_candidate.selector}' (Score: {best_score:.3f}). "
                    f"{best_candidate.score.explanation if best_candidate.score else ''}"
                )

                try:
                    self._perform_action(page, best_candidate.selector, step.action, step.input_data)
                except Exception as recovery_exc:
                    step.status = StepStatus.FAIL
                    step.diagnostics.rationale += f" | Action execution on replacement failed: {recovery_exc}"
                    return step.status

                # Check backend network responses after recovery action
                time.sleep(0.3)
                if network_errors:
                    step.diagnostics.network_errors = network_errors
                    step.diagnostics.failure_category = FailureCategory.NETWORK_OR_BACKEND_ERROR
                    step.status = StepStatus.FAIL
                    step.diagnostics.rationale = f"Healed action provoked backend failure: {network_errors}."
                    return step.status

                # 8. Mandatory postcondition verification
                if step.postcondition:
                    passed = False
                    try:
                        passed = step.postcondition(page)
                    except Exception as pe:
                        passed = False
                        step.diagnostics.rationale += f" | Postcondition check error: {pe}"

                    step.diagnostics.postcondition_verified = passed
                    if passed:
                        step.status = StepStatus.SELF_HEALED
                    else:
                        # Crucial rule: Never report SELF-HEALED unless postcondition passes
                        step.status = StepStatus.FAIL
                        step.diagnostics.failure_category = FailureCategory.ASSERTION_FAILED
                        step.diagnostics.rationale += " | Postcondition failed; recovery rejected."
                else:
                    step.status = StepStatus.SELF_HEALED

                return step.status

        finally:
            step.diagnostics.execution_time_ms = round((time.time() - start_time) * 1000, 2)
            try:
                page.remove_listener("response", on_response)
            except Exception:
                pass
            if verbose:
                print(TestPhoenixReporter.format_step_report(test_name, step))
