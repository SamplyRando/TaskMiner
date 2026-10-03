from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.notification import NotificationEntityType, NotificationType


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    workspace_id: UUID
    actor_user_id: UUID | None
    type: NotificationType
    title: str
    message: str
    entity_type: NotificationEntityType | None
    entity_id: UUID | None
    read_at: datetime | None
    created_at: datetime


class NotificationPage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[NotificationRead]
    total: int = Field(ge=0)
    offset: int = Field(ge=0)
    limit: int = Field(ge=1)


class NotificationUnreadCount(BaseModel):
    model_config = ConfigDict(extra="forbid")

    unread_count: int = Field(ge=0)


class NotificationMarkAllResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    updated_count: int = Field(ge=0)
