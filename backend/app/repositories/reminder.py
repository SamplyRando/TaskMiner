from dataclasses import dataclass
from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.reminder_delivery import ReminderDelivery
from app.models.task import Task
from app.models.user import User
from app.models.user_preference import UserPreference
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember


@dataclass(frozen=True, slots=True)
class ReminderCandidate:
    workspace_id: UUID
    workspace_name: str
    recipient_user_id: UUID
    recipient_email: str
    entity_type: str
    entity_id: UUID
    entity_name: str
    project_name: str | None
    due_at: datetime
    lead_days: int


class ReminderRepository:
    """Find eligible reminders and persist concurrency-safe delivery claims."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def list_candidates(self, now: datetime) -> list[ReminderCandidate]:
        return self._task_candidates(now) + self._project_candidates(now)

    def _task_candidates(self, now: datetime) -> list[ReminderCandidate]:
        lead_days = func.coalesce(UserPreference.reminder_lead_days, 2)
        enabled = func.coalesce(UserPreference.notify_task_reminders, True)
        rows = self.session.execute(
            select(
                Workspace.id,
                Workspace.name,
                User.id,
                User.email,
                Task.id,
                Task.title,
                Project.name,
                Task.due_date,
                lead_days,
            )
            .join(Project, Task.project_id == Project.id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .join(User, Task.assigned_user_id == User.id)
            .join(
                WorkspaceMember,
                (WorkspaceMember.workspace_id == Workspace.id)
                & (WorkspaceMember.user_id == User.id),
            )
            .outerjoin(UserPreference, UserPreference.user_id == User.id)
            .where(
                Task.due_date.is_not(None),
                Task.due_date >= now,
                Task.due_date <= now + timedelta(days=7),
                Task.status_is_completed.is_(False),
                Task.deleted_at.is_(None),
                Project.deleted_at.is_(None),
                Workspace.deleted_at.is_(None),
                User.is_active.is_(True),
                User.deleted_at.is_(None),
                enabled.is_(True),
            )
        ).all()
        return [
            ReminderCandidate(
                workspace_id=row[0],
                workspace_name=row[1],
                recipient_user_id=row[2],
                recipient_email=row[3],
                entity_type="task",
                entity_id=row[4],
                entity_name=row[5],
                project_name=row[6],
                due_at=row[7],
                lead_days=int(row[8]),
            )
            for row in rows
            if row[7] <= now + timedelta(days=int(row[8]))
        ]

    def _project_candidates(self, now: datetime) -> list[ReminderCandidate]:
        lead_days = func.coalesce(UserPreference.reminder_lead_days, 2)
        enabled = func.coalesce(UserPreference.notify_project_reminders, True)
        rows = self.session.execute(
            select(
                Workspace.id,
                Workspace.name,
                User.id,
                User.email,
                Project.id,
                Project.name,
                Project.due_date,
                lead_days,
            )
            .join(Workspace, Project.workspace_id == Workspace.id)
            .join(User, Workspace.owner_id == User.id)
            .join(
                WorkspaceMember,
                (WorkspaceMember.workspace_id == Workspace.id)
                & (WorkspaceMember.user_id == User.id),
            )
            .outerjoin(UserPreference, UserPreference.user_id == User.id)
            .where(
                Project.due_date.is_not(None),
                Project.due_date >= now,
                Project.due_date <= now + timedelta(days=7),
                Project.deleted_at.is_(None),
                Workspace.deleted_at.is_(None),
                User.is_active.is_(True),
                User.deleted_at.is_(None),
                enabled.is_(True),
            )
        ).all()
        return [
            ReminderCandidate(
                workspace_id=row[0],
                workspace_name=row[1],
                recipient_user_id=row[2],
                recipient_email=row[3],
                entity_type="project",
                entity_id=row[4],
                entity_name=row[5],
                project_name=None,
                due_at=row[6],
                lead_days=int(row[7]),
            )
            for row in rows
            if row[6] <= now + timedelta(days=int(row[7]))
        ]

    def get_or_create_delivery(
        self,
        candidate: ReminderCandidate,
    ) -> ReminderDelivery:
        statement = (
            insert(ReminderDelivery)
            .values(
                workspace_id=candidate.workspace_id,
                recipient_user_id=candidate.recipient_user_id,
                entity_type=candidate.entity_type,
                entity_id=candidate.entity_id,
                due_at=candidate.due_at,
                lead_days=candidate.lead_days,
            )
            .on_conflict_do_nothing(
                constraint="uq_reminder_deliveries_logical_delivery"
            )
            .returning(ReminderDelivery.id)
        )
        delivery_id = self.session.scalar(statement)
        self.session.commit()
        if delivery_id is not None:
            delivery = self.session.get(ReminderDelivery, delivery_id)
            assert delivery is not None
            return delivery
        existing = self.session.scalar(
            select(ReminderDelivery).where(
                ReminderDelivery.recipient_user_id == candidate.recipient_user_id,
                ReminderDelivery.entity_type == candidate.entity_type,
                ReminderDelivery.entity_id == candidate.entity_id,
                ReminderDelivery.due_at == candidate.due_at,
                ReminderDelivery.lead_days == candidate.lead_days,
            )
        )
        assert existing is not None
        return existing

    def claim_email_attempt(self, delivery_id: UUID, now: datetime) -> bool:
        claimed = self.session.scalar(
            update(ReminderDelivery)
            .where(
                ReminderDelivery.id == delivery_id,
                ReminderDelivery.email_status == "pending",
            )
            .values(email_status="sending", email_attempted_at=now)
            .returning(ReminderDelivery.id)
        )
        self.session.commit()
        return claimed is not None

    def finish_email_attempt(
        self,
        delivery_id: UUID,
        *,
        delivered: bool,
        now: datetime,
    ) -> None:
        self.session.execute(
            update(ReminderDelivery)
            .where(ReminderDelivery.id == delivery_id)
            .values(
                email_status="sent" if delivered else "failed",
                email_sent_at=now if delivered else None,
            )
        )
        self.session.commit()
