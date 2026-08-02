import asyncio
from collections.abc import AsyncGenerator, AsyncIterator
from typing import cast
from uuid import uuid4

from fastapi.testclient import TestClient
import pytest

from app.api.deps import get_audit_stream_broker
from app.core.events import (
    ActivityEventType,
    ActivityResourceType,
    DomainEvent,
    publish,
)
from app.main import app, audit_stream_broker
from app.models.workspace_member import WorkspaceMemberRole
from app.realtime.audit_stream import AuditStreamBroker
from app.schemas.audit import AuditRead
from tests.factories import (
    CreatedWorkspace,
    RegisteredUser,
    UserFactory,
    WorkspaceFactory,
    WorkspaceMemberFactory,
)


class FiniteAuditBroker:
    def subscribe_workspace(self, workspace_id: object) -> None:
        del workspace_id

    def unsubscribe_workspace(
        self,
        workspace_id: object,
        subscription: object,
    ) -> None:
        del workspace_id, subscription

    async def stream(
        self,
        workspace_id: object,
        initial_events: list[AuditRead],
        *,
        subscription: object = None,
    ) -> AsyncIterator[str]:
        del workspace_id, subscription
        if initial_events:
            for event in initial_events:
                yield AuditStreamBroker.format_audit(event)
        else:
            yield AuditStreamBroker.format_heartbeat()


def test_stream_requires_authentication(client: TestClient) -> None:
    response = client.get(
        "/api/v1/audit/stream",
        params={"workspace_id": str(uuid4())},
    )

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


@pytest.mark.parametrize(
    ("role", "expected_status"),
    [
        (WorkspaceMemberRole.ADMIN, 200),
        (WorkspaceMemberRole.MEMBER, 403),
        (WorkspaceMemberRole.VIEWER, 403),
    ],
)
def test_stream_enforces_audit_permissions(
    client: TestClient,
    workspace: CreatedWorkspace,
    user_factory: UserFactory,
    workspace_member_factory: WorkspaceMemberFactory,
    role: WorkspaceMemberRole,
    expected_status: int,
) -> None:
    actor = user_factory.create()
    workspace_member_factory.create(workspace, actor, role=role)
    app.dependency_overrides[get_audit_stream_broker] = FiniteAuditBroker
    try:
        response = client.get(
            "/api/v1/audit/stream",
            headers=actor.headers,
            params={"workspace_id": str(workspace.id)},
        )
    finally:
        app.dependency_overrides.pop(get_audit_stream_broker, None)

    assert response.status_code == expected_status


def test_foreign_workspace_stream_is_hidden(
    client: TestClient,
    user: RegisteredUser,
    other_user: RegisteredUser,
    workspace_factory: WorkspaceFactory,
) -> None:
    workspace = workspace_factory.create(other_user)

    response = client.get(
        "/api/v1/audit/stream",
        headers=user.headers,
        params={"workspace_id": str(workspace.id)},
    )

    assert response.status_code == 404


def test_stream_returns_sse_headers_and_heartbeat(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    app.dependency_overrides[get_audit_stream_broker] = FiniteAuditBroker
    try:
        response = client.get(
            "/api/v1/audit/stream",
            headers=workspace.owner.headers,
            params={"workspace_id": str(workspace.id)},
        )
    finally:
        app.dependency_overrides.pop(get_audit_stream_broker, None)

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert response.headers["cache-control"] == "no-cache"
    assert response.headers["x-accel-buffering"] == "no"
    assert "event: heartbeat" in response.text


def test_stream_replays_after_last_event_id(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    first = DomainEvent(
        event_type=ActivityEventType.PROJECT_CREATED,
        resource_type=ActivityResourceType.PROJECT,
        workspace_id=workspace.id,
        resource_id=uuid4(),
        actor_id=workspace.owner.id,
    )
    second = DomainEvent(
        event_type=ActivityEventType.TASK_UPDATED,
        resource_type=ActivityResourceType.TASK,
        workspace_id=workspace.id,
        resource_id=uuid4(),
        actor_id=workspace.owner.id,
        old_values={"title": "Before"},
        new_values={"title": "After"},
    )
    publish(first)
    publish(second)
    app.dependency_overrides[get_audit_stream_broker] = FiniteAuditBroker
    try:
        response = client.get(
            "/api/v1/audit/stream",
            headers={**workspace.owner.headers, "Last-Event-ID": str(first.id)},
            params={"workspace_id": str(workspace.id)},
        )
    finally:
        app.dependency_overrides.pop(get_audit_stream_broker, None)

    assert response.status_code == 200
    assert f"id: {second.id}" in response.text
    assert f"id: {first.id}" not in response.text
    assert '"event":"task_updated"' in response.text
    assert '"success":true' in response.text


def test_broker_delivers_new_logs_and_isolates_workspaces(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    workspace_factory: WorkspaceFactory,
) -> None:
    other_workspace = workspace_factory.create(other_user)
    expected = DomainEvent(
        event_type=ActivityEventType.MEMBER_ROLE_UPDATED,
        resource_type=ActivityResourceType.MEMBER,
        workspace_id=workspace.id,
        resource_id=uuid4(),
        actor_id=workspace.owner.id,
        success=False,
    )

    async def receive_event() -> str:
        stream = cast(
            AsyncGenerator[str, None],
            audit_stream_broker.stream(
                workspace.id,
                [],
                heartbeat_seconds=0.2,
            ),
        )
        pending = asyncio.create_task(anext(stream))
        await asyncio.sleep(0)
        publish(
            DomainEvent(
                event_type=ActivityEventType.COMMENT_CREATED,
                resource_type=ActivityResourceType.COMMENT,
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
    assert '"success":false' in frame
    assert str(other_workspace.id) not in frame
