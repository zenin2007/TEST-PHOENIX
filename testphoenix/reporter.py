import re
from testphoenix.models import IntentStep

def to_ascii_safe(text: str) -> str:
    """Strips non-ASCII characters (e.g. emojis) to prevent Windows cp1252 charmap crashes."""
    if not text:
        return ""
    return re.sub(r'[^\x00-\x7F]+', ' ', str(text)).strip()

class TestPhoenixReporter:
    """
    Structured logging and diagnostic reporting for TestPhoenix.
    Tagline: 'Rise above every UI change.'
    """
    __test__ = False

    @staticmethod
    def format_step_report(test_name: str, step: IntentStep) -> str:
        lines = []
        lines.append("=" * 80)
        lines.append(f">> TestPhoenix Execution Report -- '{to_ascii_safe(test_name)}'")
        lines.append("   Tagline: 'Rise above every UI change.'")
        lines.append("-" * 80)
        lines.append(f"* Intent:            {to_ascii_safe(step.intent)}")
        lines.append(f"* Original Selector: {step.original_locator}")
        lines.append(f"* Action:            {step.action.value} (Input: {to_ascii_safe(str(step.input_data))})")
        lines.append(f"* Final Status:      [{step.status.value}]")
        lines.append(f"* Failure Category:  {step.diagnostics.failure_category.value}")

        if step.diagnostics.original_error:
            lines.append(f"* Original Error:    {to_ascii_safe(step.diagnostics.original_error.strip().splitlines()[0])}")

        if step.diagnostics.network_errors:
            lines.append(f"* Network Errors:    {[to_ascii_safe(e) for e in step.diagnostics.network_errors]}")

        if step.diagnostics.candidates_evaluated:
            lines.append("\nCandidates Evaluated & Ranked:")
            for idx, c in enumerate(step.diagnostics.candidates_evaluated[:5], start=1):
                score_str = f"{c.score.total_score:.3f}" if c.score else "N/A"
                expl = c.score.explanation if c.score else ""
                lines.append(f"   [{idx}] Score: {score_str} | Selector: '{c.selector}' | Name: '{to_ascii_safe(c.accessible_name)}' | Role: '{c.role}'")
                if expl:
                    lines.append(f"       -> {to_ascii_safe(expl)}")

        if step.diagnostics.selected_candidate:
            c = step.diagnostics.selected_candidate
            lines.append(f"\n>> Selected Replacement: '{c.selector}'")
            lines.append(f"   Rationale: {to_ascii_safe(step.diagnostics.rationale)}")
            if step.diagnostics.score_margin is not None:
                lines.append(f"   Margin over 2nd candidate: {step.diagnostics.score_margin:.3f}")

        lines.append(f"\n* Recovery Attempts: {step.diagnostics.recovery_attempts}")
        lines.append(f"* Postcondition:     {'VERIFIED' if step.diagnostics.postcondition_verified else 'NOT VERIFIED'}")
        if step.postcondition_description:
            lines.append(f"  ({to_ascii_safe(step.postcondition_description)})")
        lines.append("=" * 80)
        return "\n".join(lines)

    @staticmethod
    def to_dict(test_name: str, step: IntentStep) -> dict:
        candidates_data = []
        for c in step.diagnostics.candidates_evaluated:
            candidates_data.append({
                "selector": c.selector,
                "role": c.role,
                "accessible_name": to_ascii_safe(c.accessible_name),
                "score": c.score.total_score if c.score else 0.0,
                "explanation": to_ascii_safe(c.score.explanation if c.score else "")
            })

        return {
            "test_name": to_ascii_safe(test_name),
            "intent": to_ascii_safe(step.intent),
            "original_selector": step.original_locator,
            "action": step.action.value,
            "input_data": to_ascii_safe(str(step.input_data)),
            "final_status": step.status.value,
            "failure_category": step.diagnostics.failure_category.value,
            "original_error": to_ascii_safe(step.diagnostics.original_error or ""),
            "network_errors": [to_ascii_safe(e) for e in step.diagnostics.network_errors],
            "selected_replacement": step.diagnostics.selected_candidate.selector if step.diagnostics.selected_candidate else None,
            "score_margin": step.diagnostics.score_margin,
            "recovery_attempts": step.diagnostics.recovery_attempts,
            "postcondition_verified": step.diagnostics.postcondition_verified,
            "candidates": candidates_data
        }
