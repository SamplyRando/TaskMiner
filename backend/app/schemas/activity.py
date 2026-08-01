from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.activity_messages import build_activity_message
from app.core.events import ActivityEventType, ActivityResourceType
from app.models.activity import Activity


class ActivityPeriod(str, Enum):
    TODAY = "today"
    WEEK = "week"
    MONTH = "month"


class ActivityListParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=20, ge=1, le=100)
    actor_id: UUID | None = None
    event_type: ActivityEventType | None = None
    period: ActivityPeriod | None = None
    search: str | None = Field(default=None, min_length=1, max_length=255)


class ActivityActorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    email: EmailStr
    full_name: str


class ActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    created_at: datetime
    actor: ActivityActorRead | None
    type: ActivityEventType
    entity: ActivityResourceType
    entity_id: UUID
    workspace_id: UUID
    message: str
    event: ActivityEventType
    resource: ActivityResourceType
    actor_id: UUID | None
    metadata: dict[str, Any]

    @classmethod
    def from_activity(cls, activity: Activity) -> "ActivityRead":
        return cls(
            id=activity.id,
            created_at=activity.created_at,
            actor=(
                ActivityActorRead.model_validate(activity.actor)
                if activity.actor is not None
                else None
            ),
            type=activity.event_type,
            entity=activity.resource_type,
            entity_id=activity.resource_id,
            workspace_id=activity.workspace_id,
            message=build_activity_message(
                activity.event_type,
                activity.activity_metadata,
            ),
            event=activity.event_type,
            resource=activity.resource_type,
            actor_id=activity.actor_id,
            metadata=activity.activity_metadata,
        )


class ActivityFeed(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    items: list[ActivityRead]
    count: int
