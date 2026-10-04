from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.task import TaskPriority
from app.schemas.task import STATUS_PATTERN


class ProjectTemplateStatus(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    key: str = Field(pattern=STATUS_PATTERN)
    label: str = Field(min_length=1, max_length=100)
    position: int = Field(ge=0, le=9)
    is_completed: bool


class ProjectTemplateTask(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5_000)
    priority: TaskPriority = TaskPriority.MEDIUM
    status: str = Field(pattern=STATUS_PATTERN)


class ProjectTemplate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    format: Literal["taskminer-project-template"]
    version: Literal[1]
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5_000)
    statuses: list[ProjectTemplateStatus] = Field(min_length=2, max_length=10)
    tasks: list[ProjectTemplateTask] = Field(default_factory=list, max_length=500)

    @model_validator(mode="after")
    def validate_workflow(self) -> Self:
        keys = [status.key for status in self.statuses]
        positions = [status.position for status in self.statuses]
        if len(keys) != len(set(keys)):
            raise ValueError("template status keys must be unique")
        if sorted(positions) != list(range(len(positions))):
            raise ValueError("template status positions must be contiguous")
        if sum(status.is_completed for status in self.statuses) != 1:
            raise ValueError("template must define exactly one completed status")
        if any(task.status not in set(keys) for task in self.tasks):
            raise ValueError("template task references an unknown status")
        return self
