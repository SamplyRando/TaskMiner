from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.task import TaskPriority


class AIProjectPlanRequest(BaseModel):
    """Validated context used to generate a transient project-plan draft."""

    model_config = ConfigDict(extra="forbid")

    workspace_id: UUID
    project_id: UUID | None = None
    prompt: str = Field(min_length=10, max_length=5_000)
    target_date: date | None = None

    @field_validator("prompt", mode="before")
    @classmethod
    def trim_prompt(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class AIGeneratedTask(BaseModel):
    """One task suggestion in a generated project-plan draft."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5_000)
    priority: TaskPriority
    suggested_due_date: date | None = None
    milestone: str | None = Field(default=None, max_length=255)
    order: int = Field(ge=1)
    depends_on: list[int] = Field(default_factory=list)


class AIGeneratedMilestone(BaseModel):
    """One milestone suggestion in a generated project-plan draft."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5_000)
    suggested_due_date: date | None = None
    order: int = Field(ge=1)


class AIProjectPlanResponse(BaseModel):
    """Structured, non-persisted plan proposed by an AI provider."""

    model_config = ConfigDict(extra="forbid")

    summary: str = Field(min_length=1, max_length=2_000)
    tasks: list[AIGeneratedTask]
    milestones: list[AIGeneratedMilestone]
    warnings: list[str]
