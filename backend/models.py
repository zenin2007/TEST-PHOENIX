from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from urllib.parse import urlparse

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Task title")
    description: Optional[str] = Field(default="", max_length=1000, description="Detailed description")
    assignee: str = Field(..., min_length=1, max_length=100, description="Person assigned to task")
    status: str = Field(default="Todo", description="Task workflow status (Todo, In Progress, Done)")

class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = ""
    assignee: str
    status: str
    created_at: str

class OrderCreate(BaseModel):
    product_name: str = Field(..., min_length=1, max_length=200, description="Product name")
    price: float = Field(..., gt=0, description="Product price")
    quantity: int = Field(default=1, ge=1, description="Quantity")
    customer_name: str = Field(..., min_length=1, max_length=100, description="Customer recipient name")
    status: str = Field(default="Placed", description="Order status")

class OrderResponse(BaseModel):
    id: int
    product_name: str
    price: float
    quantity: int
    customer_name: str
    status: str
    created_at: str

class FailureModeRequest(BaseModel):
    enabled: bool

class ResetDataRequest(BaseModel):
    seed: bool = True

class TestRunRequest(BaseModel):
    scenario: str = Field(default="version-a", description="Scenario key: version-a, version-b, broken, ambiguous, shopping-a, shopping-b")

class LiveTestRequest(BaseModel):
    test_name: str = Field(..., min_length=1, max_length=200, description="Test name")
    website_url: str = Field(..., min_length=4, max_length=2000, description="Website URL to test")
    intent: str = Field(..., min_length=1, max_length=1000, description="Natural-language test intent")
    expected_outcome: str = Field(..., min_length=1, max_length=1000, description="Expected outcome")

    @field_validator("website_url")
    @classmethod
    def validate_website_url(cls, v: str) -> str:
        cleaned = v.strip()
        if not (cleaned.startswith("http://") or cleaned.startswith("https://")):
            raise ValueError("URL must start with http:// or https://")
        parsed = urlparse(cleaned)
        if not parsed.netloc:
            raise ValueError("URL must include a valid domain or host (e.g., https://example.com)")
        return cleaned

class ExecutionEvent(BaseModel):
    timestamp: str
    action: str
    target: str
    status: str
    url: Optional[str] = None
    evidence: Optional[str] = None
    error: Optional[str] = None

class ActionReport(BaseModel):
    intent: str
    action_type: str
    target_description: str
    original_locator: Optional[str] = None
    original_locator_worked: bool = True
    failure_reason: Optional[str] = None
    recovered_action: Optional[str] = None
    candidates: List[Dict[str, Any]] = Field(default_factory=list)
    selected_candidate: Optional[str] = None
    score: Optional[float] = None
    score_breakdown: Optional[Dict[str, float]] = None
    safety_decision: str = "PASS"
    execution_result: str = "PASS"
    verification_result: str = "VERIFIED"
    duration_ms: float = 0.0

class LiveTestResponse(BaseModel):
    run_id: str
    test_name: str
    website_url: str
    actual_url: str
    page_title: str
    intent: str
    expected_outcome: str
    status: str  # PASSED, SELF_HEALED, HUMAN_REVIEW_REQUIRED, GENUINE_FAILURE
    execution_duration_ms: float
    events: List[ExecutionEvent]
    actions: List[ActionReport] = Field(default_factory=list)
    self_healed_count: int = 0
    verification_evidence: Optional[str] = None
    screenshot_base64: Optional[str] = None
    dom_summary: Dict[str, Any]
    accessibility_summary: Dict[str, Any]
    error: Optional[str] = None


