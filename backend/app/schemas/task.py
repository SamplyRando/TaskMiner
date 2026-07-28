from datetime import datetime
from typing import Literal, Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.task import TaskPriority, TaskStatus


class TaskCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: datetime | None = None


class TaskUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    due_date: datetime | None = None

    @model_validator(mode="after")
    def reject_null_required_fields(self) -> Self:
        required_fields = ("title", "status", "priority")
        for field in required_fields:
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class TaskListParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=20, ge=1, le=100)
    search: str | None = Field(default=None, min_length=1, max_length=255)
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    project_id: UUID | None = None
    sort: Literal[
        "created_at",
        "updated_at",
        "title",
        "-created_at",
        "-updated_at",
        "-title",
    ] = "-created_at"


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    title: str
    description: str | None
    status: TaskStatus
    priority: TaskPriority
    due_date: datetime | None
    project_id: UUID
    assigned_user_id: UUID | None
    created_at: datetime
    updated_at: datetime
