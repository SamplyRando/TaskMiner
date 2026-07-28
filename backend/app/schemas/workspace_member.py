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
