from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.task import STATUS_PATTERN


class ProjectTaskStatusRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    key: str
    label: str
    position: int
    is_completed: bool


class ProjectTaskStatusCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    label: str = Field(min_length=1, max_length=100)
    is_completed: bool = False


class ProjectTaskStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    label: str | None = Field(default=None, min_length=1, max_length=100)
    is_completed: bool | None = None


class ProjectTaskStatusReorder(BaseModel):
    model_config = ConfigDict(extra="forbid")

    keys: list[str] = Field(min_length=2, max_length=10)

    @model_validator(mode="after")
    def unique_keys(self):
        if len(self.keys) != len(set(self.keys)):
            raise ValueError("status keys must be unique")
        return self


class ProjectTaskStatusDelete(BaseModel):
    model_config = ConfigDict(extra="forbid")

    replacement_status: str | None = Field(default=None, pattern=STATUS_PATTERN)


class ProjectCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5_000)
    due_date: datetime | None = None


class ProjectUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5_000)
    due_date: datetime | None = None


class ProjectListParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=20, ge=1, le=100)
    search: str | None = Field(default=None, min_length=1, max_length=255)
    workspace_id: UUID | None = None
    sort: Literal[
        "created_at",
        "updated_at",
        "name",
        "-created_at",
        "-updated_at",
        "-name",
    ] = "-created_at"


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    due_date: datetime | None
    owner_id: UUID
    workspace_id: UUID
    created_at: datetime
    updated_at: datetime
    task_statuses: list[ProjectTaskStatusRead]
