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
    LOCATOR_MISSING = "LOCATOR_MISSING"
    AMBIGUOUS_MATCH = "AMBIGUOUS_MATCH"
    LOCATOR_AMBIGUOUS = "LOCATOR_AMBIGUOUS"
    ELEMENT_NOT_INTERACTABLE = "ELEMENT_NOT_INTERACTABLE"
    ASSERTION_FAILED = "ASSERTION_FAILED"
    NETWORK_OR_BACKEND_ERROR = "NETWORK_OR_BACKEND_ERROR"
    BACKEND_OR_NETWORK_ERROR = "BACKEND_OR_NETWORK_ERROR"
    TIMEOUT = "TIMEOUT"
    PERMISSION_ERROR = "PERMISSION_ERROR"
    UNKNOWN_FAILURE = "UNKNOWN_FAILURE"
    UNKNOWN = "UNKNOWN"

# Type alias for failure classification
FailureClassification = FailureCategory

class StepAction(str, Enum):
    CLICK = "click"
    FILL = "fill"
    SELECT_OPTION = "select_option"
    NAVIGATE = "navigate"
    SUBMIT = "submit"
    CUSTOM = "custom"

@dataclass
class Target:
    """Semantic target element specification decoupled from CSS selectors."""
    name: str
    role: Optional[str] = None
    selector: Optional[str] = None
    container: Optional[str] = None
    attributes: Dict[str, str] = field(default_factory=dict)

@dataclass
class Action:
    """First-class semantic action representation."""
    verb: str  # click, fill, select, submit, navigate
    target: Target
    value: Optional[Any] = None

@dataclass
class Precondition:
    """Precondition requirement before step execution."""
    description: str
    validator: Optional[Callable[[Page], bool]] = None

@dataclass
class Postcondition:
    """Postcondition expectation to verify outcome validity."""
    description: str
    validator: Optional[Callable[[Page], bool]] = None
    target_text: Optional[str] = None
    target_selector: Optional[str] = None

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
    bounding_box: Optional[Dict[str, float]] = None
    score: Optional[CandidateScore] = None

@dataclass
class RecoveryPlan:
    """Explainable recovery plan generated after candidate discovery."""
    original_target: Target
    selected_candidate: Optional[CandidateElement] = None
    confidence_score: float = 0.0
    ambiguity_margin: float = 0.0
    rationale: str = ""
    is_safe: bool = True
    action_sequence: List[str] = field(default_factory=list)

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
    from_healing_memory: bool = False

@dataclass
class IntentStep:
    intent: str
    original_locator: Optional[str] = None
    action: StepAction = StepAction.CLICK
    semantic_action: Optional[Action] = None
    expected_role: Optional[str] = None
    expected_name: Optional[str] = None
    input_data: Optional[Any] = None
    target: Optional[Target] = None
    is_idempotent: bool = True
    postcondition: Optional[Callable[[Page], bool]] = None
    postcondition_description: Optional[str] = None
    preconditions: List[Precondition] = field(default_factory=list)
    postconditions: List[Postcondition] = field(default_factory=list)
    status: StepStatus = StepStatus.PENDING
    diagnostics: StepDiagnostics = field(default_factory=StepDiagnostics)
    recovery_plan: Optional[RecoveryPlan] = None

    def __post_init__(self):
        # Synchronize Target if provided or synthesized
        if not self.target and self.expected_name:
            self.target = Target(name=self.expected_name, role=self.expected_role, selector=self.original_locator)
        elif self.target and not self.expected_name:
            self.expected_name = self.target.name
            if not self.expected_role:
                self.expected_role = self.target.role
            if not self.original_locator and self.target.selector:
                self.original_locator = self.target.selector

@dataclass
class HealingResult:
    """Summary of self-healing resolution for a step or workflow."""
    was_healed: bool
    status: StepStatus
    original_locator: Optional[str] = None
    replacement_selector: Optional[str] = None
    confidence: float = 0.0
    margin: float = 0.0
    score_breakdown: Optional[CandidateScore] = None
    explanation: str = ""
    verified_ui: bool = False
    verified_backend: bool = False

@dataclass
class ExecutionResult:
    """Execution telemetry result."""
    test_name: str
    status: StepStatus
    duration_ms: float
    reconstructed_steps: List[str] = field(default_factory=list)
    detected_differences: List[str] = field(default_factory=list)
    recovery_count: int = 0
    verification_evidence: str = ""
    healing_results: List[HealingResult] = field(default_factory=list)

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
