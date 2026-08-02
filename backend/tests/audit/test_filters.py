from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.events import (
    ActivityEventType,
    ActivityResourceType,
    DomainEvent,
    publish,
)
from app.models.audit_log import AuditLog
from tests.factories import CreatedWorkspace, RegisteredUser


def get_filtered_audit(
    client: TestClient,
    workspace: CreatedWorkspace,
    **params: object,
) -> dict[str, Any]:
    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/audit",
        headers=workspace.owner.headers,
        params=params,
    )
    assert response.status_code == 200, response.text
    return response.json()


def publish_audit(
    workspace: CreatedWorkspace,
    actor: RegisteredUser,
    *,
    event_type: ActivityEventType,
    resource_type: ActivityResourceType,
    resource_id: UUID | None = None,
    old_values: dict[str, object] | None = None,
    new_values: dict[str, object] | None = None,
    metadata: dict[str, object] | None = None,
    success: bool = True,
) -> DomainEvent:
    event = DomainEvent(
        event_type=event_type,
        resource_type=resource_type,
        workspace_id=workspace.id,
        resource_id=resource_id or uuid4(),
        actor_id=actor.id,
        old_values=old_values,
        new_values=new_values,
        metadata=metadata or {},
        success=success,
    )
    publish(event)
    return event


def test_combines_actor_action_entity_and_result_filters(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
) -> None:
    publish_audit(
        workspace,
        workspace.owner,
        event_type=ActivityEventType.TASK_UPDATED,
        resource_type=ActivityResourceType.TASK,
        success=True,
    )
    expected = publish_audit(
        workspace,
        other_user,
        event_type=ActivityEventType.TASK_UPDATED,
        resource_type=ActivityResourceType.TASK,
        success=False,
    )

    feed = get_filtered_audit(
        client,
        workspace,
        actor_id=str(other_user.id),
        event_type="task_updated",
        resource_type="task",
        success="false",
    )

    assert feed["count"] == 1
    assert feed["items"][0]["id"] == str(expected.id)
    assert feed["items"][0]["success"] is False


def test_filters_by_period(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
) -> None:
    recent = publish_audit(
        workspace,
        workspace.owner,
        event_type=ActivityEventType.PROJECT_CREATED,
        resource_type=ActivityResourceType.PROJECT,
    )
    old = publish_audit(
        workspace,
        workspace.owner,
        event_type=ActivityEventType.PROJECT_DELETED,
        resource_type=ActivityResourceType.PROJECT,
    )
    old_log = database_session.scalar(select(AuditLog).where(AuditLog.id == old.id))
    assert old_log is not None
    old_log.created_at = datetime.now(timezone.utc) - timedelta(days=8)
    database_session.commit()

    today = get_filtered_audit(client, workspace, period="today")
    week = get_filtered_audit(client, workspace, period="week")
    month = get_filtered_audit(client, workspace, period="month")

    assert [item["id"] for item in today["items"]] == [str(recent.id)]
    assert week["count"] == 1
    assert month["count"] == 2


def test_full_text_searches_traceability_fields(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    event = publish_audit(
        workspace,
        workspace.owner,
        event_type=ActivityEventType.TASK_UPDATED,
        resource_type=ActivityResourceType.TASK,
        old_values={"title": "Original roadmap"},
        new_values={"title": "Enterprise roadmap"},
        metadata={"title": "Release task"},
        success=False,
    )

    for search in (
        workspace.owner.full_name,
        workspace.owner.email,
        workspace.name,
        str(event.resource_id),
        "Tâche modifiée",
        "task",
        "Original roadmap",
        "Enterprise roadmap",
        "Release task",
        "échec",
    ):
        feed = get_filtered_audit(client, workspace, search=search)
        assert any(item["id"] == str(event.id) for item in feed["items"])


def test_filtered_pagination_recalculates_count(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    for _ in range(3):
        publish_audit(
            workspace,
            workspace.owner,
            event_type=ActivityEventType.COMMENT_CREATED,
            resource_type=ActivityResourceType.COMMENT,
        )
    publish_audit(
        workspace,
        workspace.owner,
        event_type=ActivityEventType.ATTACHMENT_UPLOADED,
        resource_type=ActivityResourceType.ATTACHMENT,
    )

    first = get_filtered_audit(
        client,
        workspace,
        event_type="comment_created",
        limit=2,
        offset=0,
    )
    second = get_filtered_audit(
        client,
        workspace,
        event_type="comment_created",
        limit=2,
        offset=2,
    )

    assert first["count"] == second["count"] == 3
    assert len(first["items"]) == 2
    assert len(second["items"]) == 1
