from collections.abc import Callable
from dataclasses import dataclass, field
from enum import Enum
import json
from threading import RLock
from typing import Any
from uuid import UUID


class ActivityEventType(str, Enum):
    WORKSPACE_CREATED = "workspace_created"
    WORKSPACE_UPDATED = "workspace_updated"
    PROJECT_CREATED = "project_created"
    PROJECT_UPDATED = "project_updated"
    PROJECT_DELETED = "project_deleted"
    TASK_CREATED = "task_created"
    TASK_UPDATED = "task_updated"
    TASK_DELETED = "task_deleted"
    TASK_ASSIGNED = "task_assigned"
    COMMENT_CREATED = "comment_created"
    ATTACHMENT_UPLOADED = "attachment_uploaded"
    INVITATION_CREATED = "invitation_created"
    INVITATION_ACCEPTED = "invitation_accepted"
    MEMBER_ROLE_UPDATED = "member_role_updated"


class ActivityResourceType(str, Enum):
    WORKSPACE = "workspace"
    PROJECT = "project"
    TASK = "task"
    COMMENT = "comment"
    ATTACHMENT = "attachment"
    INVITATION = "invitation"
    MEMBER = "member"


@dataclass(frozen=True, slots=True)
class DomainEvent:
    event_type: ActivityEventType
    resource_type: ActivityResourceType
    workspace_id: UUID
    resource_id: UUID
    actor_id: UUID | None
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        try:
            json.dumps(self.metadata, allow_nan=False)
        except (TypeError, ValueError) as exc:
            raise ValueError("Domain event metadata must be valid JSON.") from exc
        object.__setattr__(self, "metadata", dict(self.metadata))


EventHandler = Callable[[DomainEvent], None]

_subscribers: list[EventHandler] = []
_subscribers_lock = RLock()


def subscribe(handler: EventHandler) -> None:
    """Register an idempotent synchronous domain-event subscriber."""

    with _subscribers_lock:
        if handler not in _subscribers:
            _subscribers.append(handler)


def unsubscribe(handler: EventHandler) -> None:
    """Remove a subscriber when it is currently registered."""

    with _subscribers_lock:
        if handler in _subscribers:
            _subscribers.remove(handler)


def publish(event: DomainEvent) -> None:
    """Publish an event synchronously to a stable subscriber snapshot."""

    with _subscribers_lock:
        subscribers = tuple(_subscribers)
    for handler in subscribers:
        handler(event)
