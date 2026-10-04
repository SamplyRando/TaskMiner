from datetime import datetime, timedelta, timezone
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.email.provider import EmailDeliveryResult, EmailMessage, EmailProviderError
from app.email.service import EmailService
from app.models.notification import Notification
from app.models.project import Project
from app.models.reminder_delivery import ReminderDelivery
from app.models.task import Task, TaskStatus
from app.models.user_preference import UserPreference
from app.models.workspace_member import WorkspaceMember
from app.repositories.notification import NotificationRepository
from app.repositories.reminder import ReminderRepository
from app.services.reminder import ReminderService
from tests.factories import CreatedTask


class CapturingEmailProvider:
    provider_name: Literal["resend"] = "resend"

    def __init__(self, *, fail: bool = False) -> None:
        self.fail = fail
        self.messages: list[EmailMessage] = []

    def send(self, message: EmailMessage) -> EmailDeliveryResult:
        self.messages.append(message)
        if self.fail:
            raise EmailProviderError("test reminder failure")
        return EmailDeliveryResult(delivered=True)


def _service(
    session: Session,
    provider: CapturingEmailProvider,
) -> ReminderService:
    return ReminderService(
        ReminderRepository(session),
        NotificationRepository(session),
        EmailService(
            provider,
            sender="TaskMiner <tests@example.com>",
            frontend_url="https://www.taskminer.app",
        ),
    )


def _schedule_task(
    session: Session,
    task: CreatedTask,
    *,
    due_at: datetime,
) -> Task:
    stored = session.get(Task, task.id)
    assert stored is not None
    stored.assigned_user_id = task.project.owner.id
    stored.due_date = due_at
    session.commit()
    return stored


def test_task_and_project_reminders_are_generated_once_at_boundary(
    task: CreatedTask,
    database_session: Session,
) -> None:
    now = datetime(2030, 12, 29, 9, tzinfo=timezone.utc)
    due_at = now + timedelta(days=2)
    _schedule_task(database_session, task, due_at=due_at)
    project = database_session.get(Project, task.project.id)
    assert project is not None
    project.due_date = due_at
    database_session.commit()
    provider = CapturingEmailProvider()
    service = _service(database_session, provider)

    first = service.run_scan(now=now)
    second = service.run_scan(now=now + timedelta(hours=1))

    assert first.candidates == 2
    assert first.notifications_created == 2
    assert first.emails_sent == 2
    assert second.candidates == 2
    assert second.notifications_created == 0
    assert second.emails_sent == 0
    assert len(provider.messages) == 2
    assert database_session.scalar(select(func.count(Notification.id))) == 2
    assert database_session.scalar(select(func.count(ReminderDelivery.id))) == 2


def test_reminder_before_boundary_and_overdue_entities_are_ignored(
    task: CreatedTask,
    database_session: Session,
) -> None:
    now = datetime(2031, 1, 1, 10, tzinfo=timezone.utc)
    _schedule_task(
        database_session,
        task,
        due_at=now + timedelta(days=2, seconds=1),
    )
    provider = CapturingEmailProvider()
    service = _service(database_session, provider)
    assert service.run_scan(now=now).candidates == 0

    stored = database_session.get(Task, task.id)
    assert stored is not None
    stored.due_date = now - timedelta(seconds=1)
    database_session.commit()
    assert service.run_scan(now=now).candidates == 0
    assert provider.messages == []


def test_reminders_respect_preferences_and_entity_accessibility(
    task: CreatedTask,
    database_session: Session,
) -> None:
    now = datetime(2030, 6, 1, 12, tzinfo=timezone.utc)
    stored = _schedule_task(
        database_session,
        task,
        due_at=now + timedelta(days=2),
    )
    preference = UserPreference(
        user_id=task.project.owner.id,
        notify_task_reminders=False,
        notify_project_reminders=False,
    )
    database_session.add(preference)
    database_session.commit()
    service = _service(database_session, CapturingEmailProvider())
    assert service.run_scan(now=now).candidates == 0

    preference.notify_task_reminders = True
    stored.status = TaskStatus.DONE
    database_session.commit()
    assert service.run_scan(now=now).candidates == 0

    stored.status = TaskStatus.TODO
    stored.deleted_at = now
    database_session.commit()
    assert service.run_scan(now=now).candidates == 0


def test_due_date_change_creates_a_new_logical_reminder(
    task: CreatedTask,
    database_session: Session,
) -> None:
    now = datetime(2030, 3, 30, 8, tzinfo=timezone.utc)
    stored = _schedule_task(
        database_session,
        task,
        due_at=now + timedelta(days=2),
    )
    provider = CapturingEmailProvider()
    service = _service(database_session, provider)
    assert service.run_scan(now=now).emails_sent == 1

    stored.due_date = now + timedelta(days=3)
    database_session.commit()
    assert service.run_scan(now=now + timedelta(days=1)).emails_sent == 1
    assert len(provider.messages) == 2
    assert database_session.scalar(select(func.count(ReminderDelivery.id))) == 2


def test_email_failure_is_isolated_and_not_retried(
    task: CreatedTask,
    database_session: Session,
) -> None:
    now = datetime(2030, 5, 10, 8, tzinfo=timezone.utc)
    _schedule_task(
        database_session,
        task,
        due_at=now + timedelta(days=2),
    )
    provider = CapturingEmailProvider(fail=True)
    service = _service(database_session, provider)

    first = service.run_scan(now=now)
    second = service.run_scan(now=now + timedelta(hours=1))

    assert first.notifications_created == 1
    assert first.email_failures == 1
    assert second.email_failures == 0
    assert len(provider.messages) == 1
    delivery = database_session.scalar(select(ReminderDelivery))
    assert delivery is not None
    assert delivery.email_status == "failed"


def test_task_reminder_ignores_recipient_after_membership_ends(
    task: CreatedTask,
    database_session: Session,
) -> None:
    now = datetime(2030, 8, 20, 8, tzinfo=timezone.utc)
    _schedule_task(
        database_session,
        task,
        due_at=now + timedelta(days=2),
    )
    membership = database_session.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == task.project.workspace_id,
            WorkspaceMember.user_id == task.project.owner.id,
        )
    )
    assert membership is not None
    database_session.delete(membership)
    database_session.commit()

    result = _service(database_session, CapturingEmailProvider()).run_scan(now=now)

    assert result.candidates == 0
    assert database_session.scalar(select(func.count(Notification.id))) == 0
