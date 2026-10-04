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

    def handle_domain_event(self, event: DomainEvent) -> list[Notification]:
        if not event.success:
            return []
        if event.event_type == ActivityEventType.TASK_ASSIGNED:
            notification = self._handle_task_assigned(event)
            return [notification] if notification is not None else []
        if event.event_type == ActivityEventType.COMMENT_CREATED:
            return self._handle_comment_created(event)
        return []

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

    def _handle_comment_created(self, event: DomainEvent) -> list[Notification]:
        task_id = self._metadata_uuid(event, "task_id")
        if task_id is None:
            return []
        mentioned_user_ids = self._metadata_uuids(event, "mentioned_user_ids")
        notifications = self.notify_comment_mentions(
            workspace_id=event.workspace_id,
            task_id=task_id,
            actor_id=event.actor_id,
            mentioned_user_ids=mentioned_user_ids,
            source_event_id=event.id,
            created_at=event.occurred_at,
        )
        task = self.repository.get_active_task(event.workspace_id, task_id)
        if (
            task is None
            or task.assigned_user_id is None
            or task.assigned_user_id == event.actor_id
            or task.assigned_user_id in mentioned_user_ids
        ):
            return notifications
        recipient = self.repository.get_active_workspace_user(
            event.workspace_id,
            task.assigned_user_id,
        )
        if recipient is None:
            return notifications
        preferences = self.repository.get_preferences(recipient.id)
        if preferences is not None and not preferences.notify_comments:
            return notifications
        actor_name = self._actor_name(event.workspace_id, event.actor_id)
        notification = self.repository.create_if_absent(
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
        if notification is not None:
            notifications.append(notification)
        return notifications

    def notify_comment_mentions(
        self,
        *,
        workspace_id: UUID,
        task_id: UUID,
        actor_id: UUID | None,
        mentioned_user_ids: set[UUID],
        source_event_id: UUID,
        created_at: datetime | None = None,
    ) -> list[Notification]:
        """Create one stronger mention notification per valid recipient."""

        task = self.repository.get_active_task(workspace_id, task_id)
        if task is None:
            return []
        actor_name = self._actor_name(workspace_id, actor_id)
        notifications: list[Notification] = []
        for recipient_id in mentioned_user_ids:
            if recipient_id == actor_id:
                continue
            recipient = self.repository.get_active_workspace_user(
                workspace_id,
                recipient_id,
            )
            if recipient is None:
                continue
            preferences = self.repository.get_preferences(recipient.id)
            if preferences is not None and not preferences.notify_comments:
                continue
            notification = self.repository.create_if_absent(
                workspace_id=workspace_id,
                recipient_user_id=recipient.id,
                actor_user_id=actor_id,
                notification_type=NotificationType.COMMENT_MENTION.value,
                title="Vous avez été mentionné",
                message=(
                    f"{actor_name} vous a mentionné dans la tâche « {task.title} »."
                ),
                entity_type=NotificationEntityType.TASK.value,
                entity_id=task.id,
                source_event_id=source_event_id,
                created_at=created_at or datetime.now(timezone.utc),
            )
            if notification is not None:
                notifications.append(notification)
        return notifications

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
    def _metadata_uuids(event: DomainEvent, key: str) -> set[UUID]:
        raw = event.metadata.get(key)
        if not isinstance(raw, list):
            return set()
        return {
            parsed
            for value in raw
            if (parsed := NotificationService._parse_uuid(value)) is not None
        }

    @staticmethod
    def _value_uuid(values: dict[str, object] | None, key: str) -> UUID | None:
        return NotificationService._parse_uuid(values.get(key) if values else None)

    @staticmethod
    def _parse_uuid(value: object) -> UUID | None:
        try:
            return UUID(str(value)) if value is not None else None
        except (TypeError, ValueError):
            return None
