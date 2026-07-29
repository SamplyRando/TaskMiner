from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.core.events import ActivityEventType, ActivityResourceType


class ActivityListParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=20, ge=1, le=100)


class ActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    event: Annotated[ActivityEventType, Field(validation_alias="event_type")]
    resource: Annotated[
        ActivityResourceType,
        Field(validation_alias="resource_type"),
    ]
    actor_id: UUID | None
    metadata: Annotated[
        dict[str, Any],
        Field(validation_alias="activity_metadata"),
    ]
    created_at: datetime


class ActivityFeed(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    items: list[ActivityRead]
    count: int
