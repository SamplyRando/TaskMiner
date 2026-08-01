from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
import json
from threading import RLock
from typing import Any
from uuid import UUID, uuid4


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
    id: UUID = field(default_factory=uuid4)
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    old_values: dict[str, Any] | None = None
    new_values: dict[str, Any] | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.occurred_at.tzinfo is None:
            raise ValueError("Domain event occurred_at must be timezone-aware.")
        object.__setattr__(
            self,
            "old_values",
            _validate_json_mapping("old_values", self.old_values),
        )
        object.__setattr__(
            self,
            "new_values",
            _validate_json_mapping("new_values", self.new_values),
        )
        validated_metadata = _validate_json_mapping("metadata", self.metadata)
        object.__setattr__(self, "metadata", validated_metadata or {})


def _validate_json_mapping(
    field_name: str,
    value: dict[str, Any] | None,
) -> dict[str, Any] | None:
    if value is None:
        return None
    try:
        json.dumps(value, allow_nan=False)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Domain event {field_name} must be valid JSON.") from exc
    return dict(value)


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
