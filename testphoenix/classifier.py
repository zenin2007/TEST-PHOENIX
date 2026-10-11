import re
from typing import Optional, List
from testphoenix.models import FailureCategory

class FailureClassifier:
    """
    Dedicated failure classification pipeline for Playwright test execution.
    Distinguishes true UI selector drift from backend/network errors, interactability issues, 
    timeouts, and assertion failures.
    """

    @staticmethod
    def classify(
        exception: Optional[Exception] = None,
        network_errors: Optional[List[str]] = None,
        postcondition_passed: Optional[bool] = None,
        is_ambiguous: bool = False
    ) -> FailureCategory:
        # 1. Ambiguity flag takes priority for human review
        if is_ambiguous:
            return FailureCategory.AMBIGUOUS_MATCH

        # 2. Check for genuine network or backend HTTP errors (e.g., HTTP 500, 502, 503, 504)
        if network_errors:
            for net_err in network_errors:
                err_str = str(net_err).lower()
                if re.search(r'\b50[0-9]\b', err_str) or "internal server error" in err_str or "server error" in err_str or "failed to load resource" in err_str:
                    return FailureCategory.NETWORK_OR_BACKEND_ERROR

        # 3. Check postcondition assertion failure
        if postcondition_passed is False:
            return FailureCategory.ASSERTION_FAILED

        if exception is None:
            return FailureCategory.NONE

        err_msg = str(exception).lower()

        # Check for backend or network errors in exception message
        if re.search(r'\b50[0-9]\b', err_msg) or "internal server error" in err_msg or "networkerror" in err_msg or "econnrefused" in err_msg:
            return FailureCategory.NETWORK_OR_BACKEND_ERROR

        # Check for interactability / disabled elements
        if "is disabled" in err_msg or "not interactable" in err_msg or "not clickable" in err_msg or "obscured" in err_msg or "intercepts pointer events" in err_msg:
            return FailureCategory.ELEMENT_NOT_INTERACTABLE

        # Check for permissions / security errors
        if "permission denied" in err_msg or "access denied" in err_msg or "403" in err_msg or "unauthorized" in err_msg:
            return FailureCategory.PERMISSION_ERROR

        # Check for multiple matching elements / ambiguity
        if "strict mode violation" in err_msg or "resolved to multiple elements" in err_msg or "ambiguous" in err_msg:
            return FailureCategory.AMBIGUOUS_MATCH

        # Check for assertion errors
        if "assertionerror" in err_msg or "expect(" in err_msg or "assertion failed" in err_msg:
            return FailureCategory.ASSERTION_FAILED

        # Check for timeout / missing elements
        if "waiting for locator" in err_msg or "no element found" in err_msg or "waiting for element" in err_msg:
            return FailureCategory.ELEMENT_NOT_FOUND

        if "timeout" in err_msg:
            return FailureCategory.ELEMENT_NOT_FOUND

        return FailureCategory.UNKNOWN_FAILURE
