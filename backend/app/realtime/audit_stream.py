import asyncio
from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass
from datetime import datetime, timezone
import json
from threading import RLock
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.events import DomainEvent, subscribe, unsubscribe
from app.repositories.audit import AuditRepository
from app.schemas.audit import AuditRead


HEARTBEAT_SECONDS = 15.0
SUBSCRIBER_QUEUE_SIZE = 100


@dataclass(frozen=True, slots=True)
class AuditStreamSubscription:
    loop: asyncio.AbstractEventLoop
    queue: asyncio.Queue[AuditRead]


class AuditStreamBroker:
    """Fan out persisted audit entries to authorized workspace streams."""

    def __init__(self, session_factory: Callable[[], Session]) -> None:
        self.session_factory = session_factory
        self._handler = self.handle
        self._subscriptions: dict[UUID, set[AuditStreamSubscription]] = {}
        self._lock = RLock()

    def start(self) -> None:
        subscribe(self._handler)

    def stop(self) -> None:
        unsubscribe(self._handler)
        with self._lock:
            self._subscriptions.clear()

    def handle(self, event: DomainEvent) -> None:
        with self._lock:
            subscriptions = tuple(self._subscriptions.get(event.workspace_id, ()))
        if not subscriptions:
            return

        with self.session_factory() as session:
            audit_log = AuditRepository(session).get_by_id(event.id)
            if audit_log is None:
                return
            payload = AuditRead.from_audit_log(audit_log)

        for subscription in subscriptions:
            subscription.loop.call_soon_threadsafe(
                self._enqueue,
                subscription.queue,
                payload,
            )

    async def stream(
        self,
        workspace_id: UUID,
        initial_events: list[AuditRead],
        *,
        heartbeat_seconds: float = HEARTBEAT_SECONDS,
        subscription: AuditStreamSubscription | None = None,
    ) -> AsyncIterator[str]:
        active_subscription = subscription or self.subscribe_workspace(workspace_id)
        try:
            for event in initial_events:
                yield self.format_audit(event)
            while True:
                try:
                    event = await asyncio.wait_for(
                        active_subscription.queue.get(),
                        timeout=heartbeat_seconds,
                    )
                except TimeoutError:
                    yield self.format_heartbeat()
                else:
                    yield self.format_audit(event)
        finally:
            self.unsubscribe_workspace(workspace_id, active_subscription)

    def subscribe_workspace(
        self,
        workspace_id: UUID,
    ) -> AuditStreamSubscription:
        subscription = AuditStreamSubscription(
            loop=asyncio.get_running_loop(),
            queue=asyncio.Queue(maxsize=SUBSCRIBER_QUEUE_SIZE),
        )
        with self._lock:
            self._subscriptions.setdefault(workspace_id, set()).add(subscription)
        return subscription

    def unsubscribe_workspace(
        self,
        workspace_id: UUID,
        subscription: AuditStreamSubscription,
    ) -> None:
        with self._lock:
            subscriptions = self._subscriptions.get(workspace_id)
            if subscriptions is None:
                return
            subscriptions.discard(subscription)
            if not subscriptions:
                self._subscriptions.pop(workspace_id, None)

    @staticmethod
    def _enqueue(queue: asyncio.Queue[AuditRead], event: AuditRead) -> None:
        if queue.full():
            queue.get_nowait()
        queue.put_nowait(event)

    @staticmethod
    def format_audit(event: AuditRead) -> str:
        return f"id: {event.id}\nevent: audit\ndata: {event.model_dump_json()}\n\n"

    @staticmethod
    def format_heartbeat() -> str:
        payload = json.dumps(
            {"timestamp": datetime.now(timezone.utc).isoformat()},
            separators=(",", ":"),
        )
        return f"event: heartbeat\ndata: {payload}\n\n"
