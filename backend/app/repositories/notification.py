from datetime import datetime
from uuid import UUID

from sqlalchemy import exists, func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement

from app.models.notification import Notification
from app.models.project import Project
from app.models.task import Task
from app.models.user import User
from app.models.user_preference import UserPreference
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember


class NotificationRepository:
    """Persistence and recipient-scoped queries for in-app notifications."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def get_active_task(self, workspace_id: UUID, task_id: UUID) -> Task | None:
        statement = (
            select(Task)
            .join(Project, Task.project_id == Project.id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(
                Task.id == task_id,
                Project.workspace_id == workspace_id,
                Task.deleted_at.is_(None),
                Project.deleted_at.is_(None),
                Workspace.deleted_at.is_(None),
            )
        )
        return self.session.scalar(statement)

    def get_active_workspace_user(
        self,
        workspace_id: UUID,
        user_id: UUID,
    ) -> User | None:
        statement = (
            select(User)
            .join(WorkspaceMember, WorkspaceMember.user_id == User.id)
            .join(Workspace, Workspace.id == WorkspaceMember.workspace_id)
            .where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id,
                Workspace.deleted_at.is_(None),
                User.is_active.is_(True),
                User.deleted_at.is_(None),
            )
        )
        return self.session.scalar(statement)

    def get_preferences(self, user_id: UUID) -> UserPreference | None:
        return self.session.scalar(
            select(UserPreference).where(UserPreference.user_id == user_id)
        )

    def create_if_absent(
        self,
        *,
        workspace_id: UUID,
        recipient_user_id: UUID,
        actor_user_id: UUID | None,
        notification_type: str,
        title: str,
        message: str,
        entity_type: str | None,
        entity_id: UUID | None,
        source_event_id: UUID,
        created_at: datetime,
    ) -> Notification | None:
        statement = (
            insert(Notification)
            .values(
                workspace_id=workspace_id,
                recipient_user_id=recipient_user_id,
                actor_user_id=actor_user_id,
                type=notification_type,
                title=title,
                message=message,
                entity_type=entity_type,
                entity_id=entity_id,
                source_event_id=source_event_id,
                created_at=created_at,
            )
            .on_conflict_do_nothing(constraint="uq_notifications_source_recipient_type")
            .returning(Notification.id)
        )
        notification_id = self.session.scalar(statement)
        self.session.commit()
        if notification_id is None:
            return None
        return self.session.get(Notification, notification_id)

    def list_for_recipient(
        self,
        recipient_user_id: UUID,
        *,
        offset: int,
        limit: int,
    ) -> tuple[list[Notification], int]:
        accessible = self._accessible_to(recipient_user_id)
        filters = (
            Notification.recipient_user_id == recipient_user_id,
            accessible,
        )
        total = int(
            self.session.scalar(select(func.count(Notification.id)).where(*filters))
            or 0
        )
        statement = (
            select(Notification)
            .where(*filters)
            .order_by(Notification.created_at.desc(), Notification.id.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(self.session.scalars(statement).all()), total

    def count_unread(self, recipient_user_id: UUID) -> int:
        statement = select(func.count(Notification.id)).where(
            Notification.recipient_user_id == recipient_user_id,
            Notification.read_at.is_(None),
            self._accessible_to(recipient_user_id),
        )
        return int(self.session.scalar(statement) or 0)

    def get_for_recipient(
        self,
        notification_id: UUID,
        recipient_user_id: UUID,
    ) -> Notification | None:
        statement = select(Notification).where(
            Notification.id == notification_id,
            Notification.recipient_user_id == recipient_user_id,
            self._accessible_to(recipient_user_id),
        )
        return self.session.scalar(statement)

    def set_read_at(
        self,
        notification: Notification,
        read_at: datetime | None,
    ) -> Notification:
        notification.read_at = read_at
        self.session.commit()
        self.session.refresh(notification)
        return notification

    def mark_all_read(
        self,
        recipient_user_id: UUID,
        *,
        read_at: datetime,
    ) -> int:
        statement = (
            update(Notification)
            .where(
                Notification.recipient_user_id == recipient_user_id,
                Notification.read_at.is_(None),
                self._accessible_to(recipient_user_id),
            )
            .values(read_at=read_at)
            .returning(Notification.id)
        )
        updated_ids = list(self.session.scalars(statement).all())
        self.session.commit()
        return len(updated_ids)

    @staticmethod
    def _accessible_to(recipient_user_id: UUID) -> ColumnElement[bool]:
        return exists(
            select(WorkspaceMember.id)
            .join(Workspace, Workspace.id == WorkspaceMember.workspace_id)
            .where(
                WorkspaceMember.workspace_id == Notification.workspace_id,
                WorkspaceMember.user_id == recipient_user_id,
                Workspace.deleted_at.is_(None),
            )
        )
