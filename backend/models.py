from pydantic import BaseModel, Field
from typing import Optional

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
