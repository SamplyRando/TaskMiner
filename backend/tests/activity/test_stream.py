import asyncio
from collections.abc import AsyncGenerator, AsyncIterator
from typing import cast
from uuid import uuid4

from fastapi.testclient import TestClient

from app.api.deps import get_activity_stream_broker
from app.core.events import (
    ActivityEventType,
    ActivityResourceType,
    DomainEvent,
    publish,
)
from app.main import app, activity_stream_broker
from app.realtime.activity_stream import ActivityStreamBroker
from app.schemas.activity import ActivityRead
from tests.factories import (
    CreatedWorkspace,
    RegisteredUser,
    WorkspaceFactory,
)


class FiniteActivityBroker:
    async def stream(
        self,
        workspace_id: object,
        initial_events: list[ActivityRead],
    ) -> AsyncIterator[str]:
        del workspace_id
        if initial_events:
            for event in initial_events:
                yield ActivityStreamBroker.format_activity(event)
        else:
            yield ActivityStreamBroker.format_heartbeat()


def test_stream_requires_authentication(client: TestClient) -> None:
    response = client.get(
        "/api/v1/activities/stream",
        params={"workspace_id": str(uuid4())},
    )

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_foreign_workspace_stream_is_hidden(
    client: TestClient,
    user: RegisteredUser,
    other_user: RegisteredUser,
    workspace_factory: WorkspaceFactory,
) -> None:
    workspace = workspace_factory.create(other_user)

    response = client.get(
        "/api/v1/activities/stream",
        headers=user.headers,
        params={"workspace_id": str(workspace.id)},
    )

    assert response.status_code == 404


def test_stream_returns_sse_headers_and_heartbeat(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    app.dependency_overrides[get_activity_stream_broker] = FiniteActivityBroker
    try:
        response = client.get(
            "/api/v1/activities/stream",
            headers=workspace.owner.headers,
            params={"workspace_id": str(workspace.id)},
        )
    finally:
        app.dependency_overrides.pop(get_activity_stream_broker, None)

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert response.headers["cache-control"] == "no-cache"
    assert response.headers["x-accel-buffering"] == "no"
    assert "event: heartbeat" in response.text
    assert '"timestamp"' in response.text


def test_stream_replays_events_after_last_event_id(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    first = DomainEvent(
        event_type=ActivityEventType.PROJECT_CREATED,
        resource_type=ActivityResourceType.PROJECT,
        workspace_id=workspace.id,
        resource_id=uuid4(),
        actor_id=workspace.owner.id,
        metadata={"name": "First"},
    )
    second = DomainEvent(
        event_type=ActivityEventType.TASK_CREATED,
        resource_type=ActivityResourceType.TASK,
        workspace_id=workspace.id,
        resource_id=uuid4(),
        actor_id=workspace.owner.id,
        metadata={"title": "Second"},
    )
    publish(first)
    publish(second)
    app.dependency_overrides[get_activity_stream_broker] = FiniteActivityBroker
    try:
        response = client.get(
            "/api/v1/activities/stream",
            headers={**workspace.owner.headers, "Last-Event-ID": str(first.id)},
            params={"workspace_id": str(workspace.id)},
        )
    finally:
        app.dependency_overrides.pop(get_activity_stream_broker, None)

    assert response.status_code == 200
    assert f"id: {second.id}" in response.text
    assert f"id: {first.id}" not in response.text
    assert '"type":"task_created"' in response.text
    assert '"entity":"task"' in response.text
    assert f'"workspace_id":"{workspace.id}"' in response.text


def test_broker_delivers_new_events_and_isolates_workspaces(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    workspace_factory: WorkspaceFactory,
) -> None:
    other_workspace = workspace_factory.create(other_user)
    expected = DomainEvent(
        event_type=ActivityEventType.PROJECT_UPDATED,
        resource_type=ActivityResourceType.PROJECT,
        workspace_id=workspace.id,
        resource_id=uuid4(),
        actor_id=workspace.owner.id,
        metadata={"name": "Live project"},
    )

    async def receive_event() -> str:
        stream = cast(
            AsyncGenerator[str, None],
            activity_stream_broker.stream(
                workspace.id,
                [],
                heartbeat_seconds=0.2,
            ),
        )

        async def next_frame() -> str:
            return await anext(stream)

        pending: asyncio.Task[str] = asyncio.create_task(next_frame())
        await asyncio.sleep(0)
        publish(
            DomainEvent(
                event_type=ActivityEventType.TASK_UPDATED,
                resource_type=ActivityResourceType.TASK,
                workspace_id=other_workspace.id,
                resource_id=uuid4(),
                actor_id=other_user.id,
            )
        )
        publish(expected)
        frame = await asyncio.wait_for(pending, timeout=1)
        await stream.aclose()
        return frame

    frame = asyncio.run(receive_event())

    assert f"id: {expected.id}" in frame
    assert "Live project" in frame
    assert str(other_workspace.id) not in frame
