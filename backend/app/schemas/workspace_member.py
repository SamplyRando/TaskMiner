from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.workspace_member import WorkspaceMemberRole


class WorkspaceMemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    workspace_id: UUID
    user_id: UUID
    role: WorkspaceMemberRole
    created_at: datetime


class WorkspaceMemberList(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    items: list[WorkspaceMemberRead]


class AssignableWorkspaceMemberRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: UUID
    email: str
    full_name: str | None
    role: WorkspaceMemberRole


class AssignableWorkspaceMemberList(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[AssignableWorkspaceMemberRead]


class WorkspaceMemberRoleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: WorkspaceMemberRole
