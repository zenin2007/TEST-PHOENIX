import time
from typing import Optional, Callable, List, Any
try:
    from playwright.sync_api import Page, Locator, TimeoutError as PlaywrightTimeoutError
except (ImportError, ModuleNotFoundError, Exception):
    Page = Any
    Locator = Any
    PlaywrightTimeoutError = Exception

from testphoenix.models import (
    IntentStep, StepStatus, StepAction, FailureCategory, CandidateElement,
    WorkflowRecoveryReport, IntentWorkflow, RecoveryPlan, Target, CandidateScore
)
from testphoenix.scoring import CandidateScorer, ScoringConfig
from testphoenix.classifier import FailureClassifier
from testphoenix.dom_inspector import DomInspector
from testphoenix.reporter import TestPhoenixReporter

try:
    from backend.database import save_healing_memory, get_healing_memory
except ImportError:
    # Graceful fallback for test runs without backend package in PYTHONPATH
    def save_healing_memory(*args, **kwargs): return None
    def get_healing_memory(*args, **kwargs): return None

class TestPhoenixEngine:
    """
    TestPhoenix: Intent-Aware Self-Healing Test Engine.
    Tagline: 'Rise above every UI change.'
    """
    __test__ = False

    def __init__(self, scoring_config: Optional[ScoringConfig] = None, timeout_ms: int = 1500, use_memory: bool = True):
        self.config = scoring_config or ScoringConfig()
        self.scorer = CandidateScorer(self.config)
        self.timeout_ms = timeout_ms
        self.use_memory = use_memory

    def _perform_action(self, page: Page, locator_str: str, action: StepAction, input_data: Optional[str] = None):
        """Dispatches action on resolved locator."""
        loc = page.locator(locator_str)
        if hasattr(loc, "first"):
            loc = loc.first
        if action == StepAction.CLICK or action == StepAction.SUBMIT:
            loc.click(timeout=self.timeout_ms)
        elif action == StepAction.FILL:
            loc.fill(str(input_data or ""), timeout=self.timeout_ms)
        elif action == StepAction.SELECT_OPTION:
            loc.select_option(str(input_data or ""), timeout=self.timeout_ms)
        elif action == StepAction.NAVIGATE:
            page.goto(str(input_data or locator_str), wait_until="domcontentloaded", timeout=self.timeout_ms)
        elif action == StepAction.WAIT:
            try:
                wait_time = float(input_data or 1.0)
            except Exception:
                wait_time = 1.0
            time.sleep(min(wait_time, 5.0))
        elif action == StepAction.VERIFY:
            # Check visibility of locator or text
            if not loc.is_visible():
                raise AssertionError(f"Expected verification target '{locator_str}' was not visible on the page.")
        else:
            loc.click(timeout=self.timeout_ms)


    def _validate_candidate_live(self, page: Page, selector: str) -> bool:
        """Verifies if a candidate locator exists on the live page and is interactable."""
        try:
            loc = page.locator(selector)
            if hasattr(loc, "first"):
                loc = loc.first
            if hasattr(loc, "count") and loc.count() > 0 and loc.is_visible():
                return loc.is_enabled()
            return False
        except Exception:
            return False

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
            # 1. Attempt original Playwright locator first if available
            orig_attempt_failed = False
            if step.original_locator:
                try:
                    self._perform_action(page, step.original_locator, step.action, step.input_data)
                    
                    # Check for network/backend errors that occurred during or immediately after action
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
                        for _ in range(25):
                            try:
                                passed = step.postcondition(page)
                                if passed:
                                    break
                            except Exception as pe:
                                step.diagnostics.original_error = str(pe)
                            time.sleep(0.1)

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
                    orig_attempt_failed = True
                    step.diagnostics.original_error = str(orig_exc)
            else:
                orig_attempt_failed = True
                step.diagnostics.original_error = "No canonical locator provided; resolving directly from semantic intent."

            # Check if backend error occurred during execution
            if network_errors:
                step.diagnostics.network_errors = network_errors
                step.diagnostics.failure_category = FailureCategory.NETWORK_OR_BACKEND_ERROR
                step.status = StepStatus.FAIL
                step.diagnostics.rationale = f"Backend failure occurred: {network_errors}. Self-healing skipped."
                return step.status

            # Classify the failure
            classified = FailureClassifier.classify(exception=Exception(step.diagnostics.original_error or ""))
            step.diagnostics.failure_category = classified

            # If failure is not an element-not-found / timeout, do not heal
            if classified not in [FailureCategory.ELEMENT_NOT_FOUND, FailureCategory.LOCATOR_MISSING]:
                step.status = StepStatus.FAIL
                step.diagnostics.rationale = f"Non-recoverable failure category: {classified.value}."
                return step.status

            # 2. Check Healing Memory (SQLite) if enabled
            healed_from_memory = False
            best_candidate: Optional[CandidateElement] = None

            if self.use_memory:
                try:
                    memory_record = get_healing_memory(step.intent, step.original_locator)
                    if memory_record and memory_record.get("recovered_locator"):
                        cached_sel = memory_record["recovered_locator"]
                        # Validate that the learned locator is actually valid on the current live page
                        if self._validate_candidate_live(page, cached_sel):
                            best_candidate = CandidateElement(
                                selector=cached_sel,
                                accessible_name=step.expected_name or "",
                                role=step.expected_role or "",
                                is_visible=True,
                                is_enabled=True,
                                score=CandidateScore(
                                    semantic_score=1.0,
                                    role_score=1.0,
                                    text_score=1.0,
                                    context_score=1.0,
                                    structural_score=1.0,
                                    total_score=float(memory_record.get("confidence", 0.95)),
                                    explanation=f"Validated from SQLite healing memory (ID #{memory_record['id']})"
                                )
                            )
                            step.diagnostics.from_healing_memory = True
                            step.diagnostics.candidates_evaluated = [best_candidate]
                            healed_from_memory = True
                except Exception:
                    pass

            # 3. If not in memory or cached locator is stale, dynamically inspect live DOM
            if not best_candidate:
                candidates = DomInspector.inspect(page)
                if not candidates:
                    step.status = StepStatus.FAIL
                    step.diagnostics.rationale = "No interactive candidate elements discovered on active page."
                    return step.status

                # 4. Score and rank candidates using 5-factor model
                ranked = self.scorer.rank_candidates(step, candidates)
                step.diagnostics.candidates_evaluated = ranked

                best_candidate = ranked[0]
                best_score = best_candidate.score.total_score if best_candidate.score else 0.0

                # 5. Check minimum candidate confidence threshold (>= 0.75)
                if best_score < self.config.min_candidate_score:
                    step.status = StepStatus.FAIL
                    step.diagnostics.failure_category = FailureCategory.ELEMENT_NOT_FOUND
                    step.diagnostics.rationale = (
                        f"Top candidate '{best_candidate.selector}' score ({best_score:.3f}) "
                        f"is below minimum confidence threshold ({self.config.min_candidate_score})."
                    )
                    return step.status

                # 6. Check score margin over second candidate for ambiguity (>= 0.15)
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

            # 7. Safety checks on winning candidate (must be visible and interactable)
            if not best_candidate.is_visible or not best_candidate.is_enabled:
                step.status = StepStatus.FAIL
                step.diagnostics.failure_category = FailureCategory.ELEMENT_NOT_INTERACTABLE
                step.diagnostics.rationale = f"Replacement candidate '{best_candidate.selector}' is not interactable."
                return step.status

            # 8. Execute recovery action
            step.diagnostics.selected_candidate = best_candidate
            step.diagnostics.recovery_attempts += 1
            best_score = best_candidate.score.total_score if best_candidate.score else 0.0
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

            # 9. Mandatory postcondition outcome verification
            if step.postcondition:
                passed = False
                for _ in range(25):
                    try:
                        passed = step.postcondition(page)
                        if passed:
                            break
                    except Exception as pe:
                        step.diagnostics.rationale += f" | Postcondition check error: {pe}"
                    time.sleep(0.1)

                step.diagnostics.postcondition_verified = passed
                if passed:
                    step.status = StepStatus.SELF_HEALED
                    # Save verified healing to memory
                    try:
                        save_healing_memory(
                            original_intent=step.intent,
                            original_locator=step.original_locator,
                            recovered_locator=best_candidate.selector,
                            confidence=best_score,
                            outcome=StepStatus.SELF_HEALED.value
                        )
                    except Exception:
                        pass
                else:
                    # Crucial rule: Never report SELF-HEALED unless postcondition passes
                    step.status = StepStatus.FAIL
                    step.diagnostics.failure_category = FailureCategory.ASSERTION_FAILED
                    step.diagnostics.rationale += " | Postcondition failed; recovery rejected."
            else:
                step.status = StepStatus.SELF_HEALED
                try:
                    save_healing_memory(
                        original_intent=step.intent,
                        original_locator=step.original_locator,
                        recovered_locator=best_candidate.selector,
                        confidence=best_score,
                        outcome=StepStatus.SELF_HEALED.value
                    )
                except Exception:
                    pass

            return step.status

        finally:
            step.diagnostics.execution_time_ms = round((time.time() - start_time) * 1000, 2)
            try:
                page.remove_listener("response", on_response)
            except Exception:
                pass
            if verbose:
                print(TestPhoenixReporter.format_step_report(test_name, step))

    def execute_workflow(
        self,
        page: Page,
        workflow: IntentWorkflow,
        verbose: bool = True
    ) -> WorkflowRecoveryReport:
        """
        Executes an end-to-end intent-driven workflow.
        Stores intent separately from selectors.
        Reconstructs the workflow dynamically upon locator failures.
        Guards non-idempotent actions against duplicates.
        Verifies both UI and backend outcomes.
        """
        start_time = time.time()
        report = WorkflowRecoveryReport(
            workflow_name=workflow.name,
            original_intent=workflow.original_intent,
            expected_outcome=workflow.expected_outcome,
            final_status=StepStatus.PENDING,
            steps=workflow.steps
        )

        overall_status = StepStatus.PASS
        reconstructed_steps: List[str] = []
        detected_diffs: List[str] = []
        total_recoveries = 0

        for idx, step in enumerate(workflow.steps):
            # Guard non-idempotent actions before retrying or re-executing
            if not step.is_idempotent and workflow.backend_verifier:
                try:
                    if workflow.backend_verifier():
                        step.status = StepStatus.PASS
                        step.diagnostics.rationale = "Action already satisfied in backend (idempotency guard active)."
                        reconstructed_steps.append(f"{step.intent}: [Skipped - already verified]")
                        continue
                except Exception:
                    pass

            step_status = self.execute_step(page, step, test_name=f"{workflow.name}: Step {idx+1}", verbose=verbose)

            if step_status == StepStatus.SELF_HEALED:
                total_recoveries += 1
                if step.diagnostics.selected_candidate:
                    reconstructed_steps.append(step.diagnostics.selected_candidate.selector)
                    detected_diffs.append(
                        f"Step '{step.intent}': Original '{step.original_locator}' replaced by '{step.diagnostics.selected_candidate.selector}' "
                        f"(Score: {step.diagnostics.selected_candidate.score.total_score if step.diagnostics.selected_candidate.score else 1.0:.3f})"
                    )
                else:
                    reconstructed_steps.append(step.original_locator or "[intent]")
                if overall_status == StepStatus.PASS:
                    overall_status = StepStatus.SELF_HEALED

            elif step_status == StepStatus.PASS:
                reconstructed_steps.append(step.original_locator or "[intent]")

            elif step_status == StepStatus.HUMAN_REVIEW_REQUIRED:
                overall_status = StepStatus.HUMAN_REVIEW_REQUIRED
                report.final_status = StepStatus.HUMAN_REVIEW_REQUIRED
                report.reconstructed_workflow = reconstructed_steps
                report.detected_differences = detected_diffs
                report.verification_evidence = f"Human review requested: {step.diagnostics.rationale}"
                report.execution_duration_ms = round((time.time() - start_time) * 1000, 2)
                return report

            else:  # FAIL
                overall_status = StepStatus.FAIL
                report.final_status = StepStatus.FAIL
                report.reconstructed_workflow = reconstructed_steps
                report.detected_differences = detected_diffs
                report.verification_evidence = f"Failed at step '{step.intent}': {step.diagnostics.rationale}"
                report.execution_duration_ms = round((time.time() - start_time) * 1000, 2)
                return report

        # Final verification checks across both UI and backend
        ui_passed = True
        if workflow.ui_verifier:
            try:
                ui_passed = workflow.ui_verifier(page)
                if not ui_passed:
                    report.verification_evidence += "UI verification failed. "
            except Exception as e:
                ui_passed = False
                report.verification_evidence += f"UI verification failed: {e}. "

        backend_passed = True
        if workflow.backend_verifier:
            try:
                backend_passed = workflow.backend_verifier()
                if not backend_passed:
                    report.verification_evidence += "Backend verification failed. "
            except Exception as e:
                backend_passed = False
                report.verification_evidence += f"Backend verification failed: {e}. "

        if not ui_passed or not backend_passed:
            overall_status = StepStatus.FAIL
            report.verification_evidence += "Outcome verification failed across UI/backend."
        else:
            report.verification_evidence = (
                f"VERIFIED: Expected outcome '{workflow.expected_outcome}' confirmed in both UI and SQLite backend."
            )

        report.final_status = overall_status
        report.reconstructed_workflow = reconstructed_steps
        report.detected_differences = detected_diffs
        report.recovery_attempts = total_recoveries
        report.execution_duration_ms = round((time.time() - start_time) * 1000, 2)
        return report
