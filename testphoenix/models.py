from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List, Dict, Any, Callable
from playwright.sync_api import Page

class StepStatus(str, Enum):
    PENDING = "PENDING"
    PASS = "PASS"
    SELF_HEALED = "SELF-HEALED"
    FAIL = "FAIL"
    HUMAN_REVIEW_REQUIRED = "HUMAN REVIEW REQUIRED"

class FailureCategory(str, Enum):
    NONE = "NONE"
    ELEMENT_NOT_FOUND = "ELEMENT_NOT_FOUND"
    AMBIGUOUS_MATCH = "AMBIGUOUS_MATCH"
    ELEMENT_NOT_INTERACTABLE = "ELEMENT_NOT_INTERACTABLE"
    ASSERTION_FAILED = "ASSERTION_FAILED"
    NETWORK_OR_BACKEND_ERROR = "NETWORK_OR_BACKEND_ERROR"
    UNKNOWN_FAILURE = "UNKNOWN_FAILURE"

class StepAction(str, Enum):
    CLICK = "click"
    FILL = "fill"
    SELECT_OPTION = "select_option"
    NAVIGATE = "navigate"
    CUSTOM = "custom"

@dataclass
class CandidateScore:
    semantic_score: float = 0.0     # 40% weight
    role_score: float = 0.0         # 20% weight
    text_score: float = 0.0         # 15% weight
    context_score: float = 0.0      # 15% weight
    structural_score: float = 0.0   # 10% weight
    total_score: float = 0.0        # Weighted composite [0.0 - 1.0]
    explanation: str = ""

@dataclass
class CandidateElement:
    selector: str
    tag_name: str = ""
    role: str = ""
    accessible_name: str = ""
    text_content: str = ""
    element_id: str = ""
    class_name: str = ""
    parent_context: str = ""
    attributes: Dict[str, str] = field(default_factory=dict)
    is_visible: bool = True
    is_enabled: bool = True
    score: Optional[CandidateScore] = None

@dataclass
class StepDiagnostics:
    original_error: Optional[str] = None
    failure_category: FailureCategory = FailureCategory.NONE
    candidates_evaluated: List[CandidateElement] = field(default_factory=list)
    selected_candidate: Optional[CandidateElement] = None
    score_margin: Optional[float] = None
    recovery_attempts: int = 0
    network_errors: List[str] = field(default_factory=list)
    rationale: str = ""
    postcondition_verified: bool = False
    execution_time_ms: float = 0.0
    detected_differences: str = ""

@dataclass
class IntentStep:
    intent: str
    original_locator: str
    action: StepAction = StepAction.CLICK
    expected_role: Optional[str] = None
    expected_name: Optional[str] = None
    input_data: Optional[Any] = None
    is_idempotent: bool = True
    postcondition: Optional[Callable[[Page], bool]] = None
    postcondition_description: Optional[str] = None
    status: StepStatus = StepStatus.PENDING
    diagnostics: StepDiagnostics = field(default_factory=StepDiagnostics)

@dataclass
class WorkflowRecoveryReport:
    workflow_name: str
    original_intent: str
    expected_outcome: str
    final_status: StepStatus
    steps: List[IntentStep] = field(default_factory=list)
    detected_differences: List[str] = field(default_factory=list)
    reconstructed_workflow: List[str] = field(default_factory=list)
    recovery_attempts: int = 0
    verification_evidence: str = ""
    execution_duration_ms: float = 0.0

@dataclass
class IntentWorkflow:
    name: str
    original_intent: str
    expected_outcome: str
    steps: List[IntentStep] = field(default_factory=list)
    ui_verifier: Optional[Callable[[Page], bool]] = None
    backend_verifier: Optional[Callable[[], bool]] = None
