from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.workspace_invitation import InvitationStatus
from app.models.workspace_member import WorkspaceMemberRole


class InvitationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    role: WorkspaceMemberRole


class InvitationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    workspace_id: UUID
    email: EmailStr
    role: WorkspaceMemberRole
    token: str
    status: InvitationStatus
    expires_at: datetime
    accepted_at: datetime | None
    revoked_at: datetime | None
    created_at: datetime
    updated_at: datetime


class InvitationList(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    items: list[InvitationRead]


class InvitationAccept(InvitationRead):
    """Representation returned after a successful acceptance."""
