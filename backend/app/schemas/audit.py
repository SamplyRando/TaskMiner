from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.audit_messages import build_audit_message
from app.core.events import ActivityEventType, ActivityResourceType
from app.models.audit_log import AuditLog


class AuditPeriod(str, Enum):
    TODAY = "today"
    WEEK = "week"
    MONTH = "month"


class AuditListParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=20, ge=1, le=100)
    actor_id: UUID | None = None
    event_type: ActivityEventType | None = None
    resource_type: ActivityResourceType | None = None
    period: AuditPeriod | None = None
    success: bool | None = None
    search: str | None = Field(default=None, min_length=1, max_length=255)


class AuditActorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    email: EmailStr
    full_name: str


class AuditRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    workspace_id: UUID
    workspace_name: str
    actor: AuditActorRead | None
    event: ActivityEventType
    resource: ActivityResourceType
    resource_id: UUID
    actor_id: UUID | None
    old_values: dict[str, Any] | None
    new_values: dict[str, Any] | None
    metadata: dict[str, Any]
    message: str
    success: bool
    created_at: datetime

    @classmethod
    def from_audit_log(cls, audit_log: AuditLog) -> "AuditRead":
        return cls(
            id=audit_log.id,
            workspace_id=audit_log.workspace_id,
            workspace_name=audit_log.workspace.name,
            actor=(
                AuditActorRead.model_validate(audit_log.actor)
                if audit_log.actor is not None
                else None
            ),
            event=audit_log.event_type,
            resource=audit_log.resource_type,
            resource_id=audit_log.resource_id,
            actor_id=audit_log.actor_id,
            old_values=audit_log.old_values,
            new_values=audit_log.new_values,
            metadata=audit_log.audit_metadata,
            message=build_audit_message(
                audit_log.event_type,
                audit_log.audit_metadata,
                success=audit_log.success,
            ),
            success=audit_log.success,
            created_at=audit_log.created_at,
        )


class AuditFeed(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    items: list[AuditRead]
    count: int
