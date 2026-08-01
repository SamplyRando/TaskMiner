from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.workspace_invitation import InvitationStatus
from app.models.workspace_member import WorkspaceMemberRole


class InvitationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    role: WorkspaceMemberRole


class InvitationListParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=20, ge=1, le=100)
    search: str | None = Field(default=None, min_length=1, max_length=320)
    sort: Literal[
        "email",
        "role",
        "status",
        "created_at",
        "expires_at",
        "-email",
        "-role",
        "-status",
        "-created_at",
        "-expires_at",
    ] = "-created_at"


class InvitationInviterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    email: EmailStr
    full_name: str


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
    invited_by: InvitationInviterRead | None
    created_at: datetime
    updated_at: datetime


class InvitationList(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    items: list[InvitationRead]
    total: int
    skip: int
    limit: int


class InvitationAccept(InvitationRead):
    """Representation returned after a successful acceptance."""
