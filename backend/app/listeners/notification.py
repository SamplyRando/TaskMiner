from collections.abc import Callable
import logging

from sqlalchemy.orm import Session

from app.core.events import DomainEvent, subscribe, unsubscribe
from app.repositories.notification import NotificationRepository
from app.services.notification import NotificationService


logger = logging.getLogger(__name__)


class NotificationListener:
    """Materialize supported domain events without affecting their operation."""

    def __init__(self, session_factory: Callable[[], Session]) -> None:
        self.session_factory = session_factory
        self._handler = self.handle

    def start(self) -> None:
        subscribe(self._handler)

    def stop(self) -> None:
        unsubscribe(self._handler)

    def handle(self, event: DomainEvent) -> None:
        try:
            with self.session_factory() as session:
                NotificationService(
                    NotificationRepository(session)
                ).handle_domain_event(event)
        except Exception:
            logger.exception(
                "Failed to materialize notification for domain event %s",
                event.id,
            )
