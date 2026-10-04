from dataclasses import dataclass
from datetime import datetime, timezone
import logging

from app.email.service import EmailService
from app.models.notification import NotificationEntityType, NotificationType
from app.repositories.notification import NotificationRepository
from app.repositories.reminder import ReminderCandidate, ReminderRepository


logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class ReminderScanResult:
    candidates: int = 0
    notifications_created: int = 0
    emails_sent: int = 0
    email_failures: int = 0


class ReminderService:
    """Materialize due reminders with durable logical and email idempotency."""

    def __init__(
        self,
        repository: ReminderRepository,
        notification_repository: NotificationRepository,
        email_service: EmailService,
    ) -> None:
        self.repository = repository
        self.notification_repository = notification_repository
        self.email_service = email_service

    def run_scan(self, *, now: datetime | None = None) -> ReminderScanResult:
        scan_time = now or datetime.now(timezone.utc)
        if scan_time.tzinfo is None:
            raise ValueError("Reminder scan time must be timezone-aware.")
        created = sent = failures = 0
        candidates = self.repository.list_candidates(scan_time)
        for candidate in candidates:
            delivery = self.repository.get_or_create_delivery(candidate)
            notification = self.notification_repository.create_if_absent(
                workspace_id=candidate.workspace_id,
                recipient_user_id=candidate.recipient_user_id,
                actor_user_id=None,
                notification_type=self._notification_type(candidate),
                title=self._title(candidate),
                message=self._message(candidate),
                entity_type=candidate.entity_type,
                entity_id=candidate.entity_id,
                source_event_id=delivery.id,
                created_at=scan_time,
            )
            if notification is not None:
                created += 1
            if not self.repository.claim_email_attempt(delivery.id, scan_time):
                continue
            try:
                result = self.email_service.send_due_reminder(
                    recipient=candidate.recipient_email,
                    entity_type=candidate.entity_type,
                    entity_name=candidate.entity_name,
                    workspace_name=candidate.workspace_name,
                    project_name=candidate.project_name,
                    due_at=candidate.due_at,
                    idempotency_key=f"taskminer-reminder-{delivery.id}",
                )
                delivered = result.delivered
            except Exception:
                delivered = False
                logger.exception("Failed to send due reminder %s", delivery.id)
            self.repository.finish_email_attempt(
                delivery.id,
                delivered=delivered,
                now=scan_time,
            )
            if delivered:
                sent += 1
            else:
                failures += 1
        return ReminderScanResult(
            candidates=len(candidates),
            notifications_created=created,
            emails_sent=sent,
            email_failures=failures,
        )

    @staticmethod
    def _notification_type(candidate: ReminderCandidate) -> str:
        return (
            NotificationType.TASK_DUE_REMINDER.value
            if candidate.entity_type == NotificationEntityType.TASK.value
            else NotificationType.PROJECT_DUE_REMINDER.value
        )

    @staticmethod
    def _title(candidate: ReminderCandidate) -> str:
        return (
            "Échéance de tâche à venir"
            if candidate.entity_type == NotificationEntityType.TASK.value
            else "Échéance de projet à venir"
        )

    @staticmethod
    def _message(candidate: ReminderCandidate) -> str:
        entity = "La tâche" if candidate.entity_type == "task" else "Le projet"
        due_date = candidate.due_at.astimezone(timezone.utc).strftime("%d/%m/%Y")
        return f"{entity} « {candidate.entity_name} » arrive à échéance le {due_date}."
