import asyncio
from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass
from datetime import datetime, timezone
import json
from threading import RLock
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.events import DomainEvent, subscribe, unsubscribe
from app.repositories.activity import ActivityRepository
from app.schemas.activity import ActivityRead


HEARTBEAT_SECONDS = 15.0
SUBSCRIBER_QUEUE_SIZE = 100


@dataclass(frozen=True, slots=True)
class ActivityStreamSubscription:
    loop: asyncio.AbstractEventLoop
    queue: asyncio.Queue[ActivityRead]


class ActivityStreamBroker:
    """Fan out persisted domain events to workspace-scoped SSE clients."""

    def __init__(self, session_factory: Callable[[], Session]) -> None:
        self.session_factory = session_factory
        self._handler = self.handle
        self._subscriptions: dict[
            UUID,
            set[ActivityStreamSubscription],
        ] = {}
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
            activity = ActivityRepository(session).get_by_id(event.id)
            if activity is None:
                return
            payload = ActivityRead.from_activity(activity)

        for subscription in subscriptions:
            subscription.loop.call_soon_threadsafe(
                self._enqueue,
                subscription.queue,
                payload,
            )

    async def stream(
        self,
        workspace_id: UUID,
        initial_events: list[ActivityRead],
        *,
        heartbeat_seconds: float = HEARTBEAT_SECONDS,
    ) -> AsyncIterator[str]:
        subscription = ActivityStreamSubscription(
            loop=asyncio.get_running_loop(),
            queue=asyncio.Queue(maxsize=SUBSCRIBER_QUEUE_SIZE),
        )
        self._add_subscription(workspace_id, subscription)
        try:
            for event in initial_events:
                yield self.format_activity(event)
            while True:
                try:
                    event = await asyncio.wait_for(
                        subscription.queue.get(),
                        timeout=heartbeat_seconds,
                    )
                except TimeoutError:
                    yield self.format_heartbeat()
                else:
                    yield self.format_activity(event)
        finally:
            self._remove_subscription(workspace_id, subscription)

    def _add_subscription(
        self,
        workspace_id: UUID,
        subscription: ActivityStreamSubscription,
    ) -> None:
        with self._lock:
            self._subscriptions.setdefault(workspace_id, set()).add(subscription)

    def _remove_subscription(
        self,
        workspace_id: UUID,
        subscription: ActivityStreamSubscription,
    ) -> None:
        with self._lock:
            subscriptions = self._subscriptions.get(workspace_id)
            if subscriptions is None:
                return
            subscriptions.discard(subscription)
            if not subscriptions:
                self._subscriptions.pop(workspace_id, None)

    @staticmethod
    def _enqueue(
        queue: asyncio.Queue[ActivityRead],
        event: ActivityRead,
    ) -> None:
        if queue.full():
            queue.get_nowait()
        queue.put_nowait(event)

    @staticmethod
    def format_activity(event: ActivityRead) -> str:
        return f"id: {event.id}\nevent: activity\ndata: {event.model_dump_json()}\n\n"

    @staticmethod
    def format_heartbeat() -> str:
        payload = json.dumps(
            {"timestamp": datetime.now(timezone.utc).isoformat()},
            separators=(",", ":"),
        )
        return f"event: heartbeat\ndata: {payload}\n\n"
