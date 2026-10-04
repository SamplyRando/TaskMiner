import logging

from app.core.config import settings
from app.database.database import SessionLocal
from app.email.factory import get_email_provider
from app.email.service import EmailService
from app.repositories.notification import NotificationRepository
from app.repositories.reminder import ReminderRepository
from app.services.reminder import ReminderService


logger = logging.getLogger(__name__)


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    with SessionLocal() as session:
        result = ReminderService(
            ReminderRepository(session),
            NotificationRepository(session),
            EmailService(
                get_email_provider(),
                sender=settings.email_from or "TaskMiner <no-reply@taskminer.local>",
                frontend_url=str(settings.frontend_url),
            ),
        ).run_scan()
    logger.info(
        "Reminder scan complete: candidates=%s notifications=%s emails=%s failures=%s",
        result.candidates,
        result.notifications_created,
        result.emails_sent,
        result.email_failures,
    )


if __name__ == "__main__":
    main()
