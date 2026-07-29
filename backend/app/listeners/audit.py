from collections.abc import Callable

from sqlalchemy.orm import Session

from app.core.events import DomainEvent, subscribe, unsubscribe
from app.repositories.audit import AuditRepository


class AuditListener:
    """Persist domain events as immutable audit logs."""

    def __init__(self, session_factory: Callable[[], Session]) -> None:
        self.session_factory = session_factory
        self._handler = self.handle

    def start(self) -> None:
        subscribe(self._handler)

    def stop(self) -> None:
        unsubscribe(self._handler)

    def handle(self, event: DomainEvent) -> None:
        with self.session_factory() as session:
            AuditRepository(session).create(event)
