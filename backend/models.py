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

class FailureModeRequest(BaseModel):
    enabled: bool

class ResetDataRequest(BaseModel):
    seed: bool = True

class TestRunRequest(BaseModel):
    scenario: str = Field(default="version-a", description="Scenario key: version-a, version-b, broken, ambiguous")

