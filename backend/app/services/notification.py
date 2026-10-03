from datetime import datetime, timezone
from uuid import UUID

from app.core.events import ActivityEventType, DomainEvent
from app.models.notification import (
    Notification,
    NotificationEntityType,
    NotificationType,
)
from app.models.user import User
from app.repositories.notification import NotificationRepository


class NotificationNotFoundError(Exception):
    """Raised when a notification is inaccessible to the current recipient."""


class NotificationService:
    """Materialize and expose recipient-scoped in-app notifications."""

    def __init__(self, repository: NotificationRepository) -> None:
        self.repository = repository

    def handle_domain_event(self, event: DomainEvent) -> Notification | None:
        if not event.success:
            return None
        if event.event_type == ActivityEventType.TASK_ASSIGNED:
            return self._handle_task_assigned(event)
        if event.event_type == ActivityEventType.COMMENT_CREATED:
            return self._handle_comment_created(event)
        return None

    def list_notifications(
        self,
        recipient: User,
        *,
        offset: int,
        limit: int,
    ) -> tuple[list[Notification], int]:
        return self.repository.list_for_recipient(
            recipient.id,
            offset=offset,
            limit=limit,
        )

    def unread_count(self, recipient: User) -> int:
        return self.repository.count_unread(recipient.id)

    def mark_read(self, recipient: User, notification_id: UUID) -> Notification:
        notification = self._get_notification(recipient, notification_id)
        if notification.read_at is None:
            return self.repository.set_read_at(
                notification,
                datetime.now(timezone.utc),
            )
        return notification

    def mark_unread(self, recipient: User, notification_id: UUID) -> Notification:
        notification = self._get_notification(recipient, notification_id)
        if notification.read_at is not None:
            return self.repository.set_read_at(notification, None)
        return notification

    def mark_all_read(self, recipient: User) -> int:
        return self.repository.mark_all_read(
            recipient.id,
            read_at=datetime.now(timezone.utc),
        )

    def _handle_task_assigned(self, event: DomainEvent) -> Notification | None:
        recipient_id = self._metadata_uuid(event, "assigned_user_id")
        previous_assignee_id = self._value_uuid(event.old_values, "assigned_user_id")
        if (
            recipient_id is None
            or recipient_id == event.actor_id
            or recipient_id == previous_assignee_id
        ):
            return None
        task = self.repository.get_active_task(event.workspace_id, event.resource_id)
        recipient = self.repository.get_active_workspace_user(
            event.workspace_id,
            recipient_id,
        )
        if task is None or task.assigned_user_id != recipient_id or recipient is None:
            return None
        preferences = self.repository.get_preferences(recipient.id)
        if preferences is not None and not preferences.notify_assignments:
            return None
        actor_name = self._actor_name(event.workspace_id, event.actor_id)
        return self.repository.create_if_absent(
            workspace_id=event.workspace_id,
            recipient_user_id=recipient.id,
            actor_user_id=event.actor_id,
            notification_type=NotificationType.TASK_ASSIGNED.value,
            title="Nouvelle tâche assignée",
            message=f"{actor_name} vous a assigné la tâche « {task.title} ».",
            entity_type=NotificationEntityType.TASK.value,
            entity_id=task.id,
            source_event_id=event.id,
            created_at=event.occurred_at,
        )

    def _handle_comment_created(self, event: DomainEvent) -> Notification | None:
        task_id = self._metadata_uuid(event, "task_id")
        if task_id is None:
            return None
        task = self.repository.get_active_task(event.workspace_id, task_id)
        if (
            task is None
            or task.assigned_user_id is None
            or task.assigned_user_id == event.actor_id
        ):
            return None
        recipient = self.repository.get_active_workspace_user(
            event.workspace_id,
            task.assigned_user_id,
        )
        if recipient is None:
            return None
        preferences = self.repository.get_preferences(recipient.id)
        if preferences is not None and not preferences.notify_comments:
            return None
        actor_name = self._actor_name(event.workspace_id, event.actor_id)
        return self.repository.create_if_absent(
            workspace_id=event.workspace_id,
            recipient_user_id=recipient.id,
            actor_user_id=event.actor_id,
            notification_type=NotificationType.TASK_COMMENTED.value,
            title="Nouveau commentaire",
            message=f"{actor_name} a commenté la tâche « {task.title} ».",
            entity_type=NotificationEntityType.TASK.value,
            entity_id=task.id,
            source_event_id=event.id,
            created_at=event.occurred_at,
        )

    def _get_notification(
        self,
        recipient: User,
        notification_id: UUID,
    ) -> Notification:
        notification = self.repository.get_for_recipient(
            notification_id,
            recipient.id,
        )
        if notification is None:
            raise NotificationNotFoundError
        return notification

    def _actor_name(self, workspace_id: UUID, actor_id: UUID | None) -> str:
        actor = (
            self.repository.get_active_workspace_user(workspace_id, actor_id)
            if actor_id is not None
            else None
        )
        return actor.full_name if actor is not None else "Un membre"

    @staticmethod
    def _metadata_uuid(event: DomainEvent, key: str) -> UUID | None:
        return NotificationService._parse_uuid(event.metadata.get(key))

    @staticmethod
    def _value_uuid(values: dict[str, object] | None, key: str) -> UUID | None:
        return NotificationService._parse_uuid(values.get(key) if values else None)

    @staticmethod
    def _parse_uuid(value: object) -> UUID | None:
        try:
            return UUID(str(value)) if value is not None else None
        except (TypeError, ValueError):
            return None
