from collections.abc import Callable

from sqlalchemy.orm import Session

from app.core.events import DomainEvent, subscribe, unsubscribe
from app.repositories.activity import ActivityRepository


class ActivityListener:
    """Persist domain events as workspace activity entries."""

    def __init__(self, session_factory: Callable[[], Session]) -> None:
        self.session_factory = session_factory
        self._handler = self.handle

    def start(self) -> None:
        subscribe(self._handler)

    def stop(self) -> None:
        unsubscribe(self._handler)

    def handle(self, event: DomainEvent) -> None:
        with self.session_factory() as session:
            ActivityRepository(session).create(event)
