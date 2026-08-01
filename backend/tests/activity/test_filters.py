from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.events import (
    ActivityEventType,
    ActivityResourceType,
    DomainEvent,
    publish,
)
from app.models.activity import Activity
from tests.factories import (
    CreatedWorkspace,
    ProjectFactory,
    RegisteredUser,
    TaskFactory,
)


def get_filtered_feed(
    client: TestClient,
    workspace: CreatedWorkspace,
    **params: object,
) -> dict[str, Any]:
    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/activities",
        headers=workspace.owner.headers,
        params=params,
    )
    assert response.status_code == 200, response.text
    return response.json()


def publish_activity(
    workspace: CreatedWorkspace,
    actor: RegisteredUser,
    *,
    event_type: ActivityEventType,
    resource_type: ActivityResourceType,
    resource_id: UUID | None = None,
    metadata: dict[str, object] | None = None,
) -> None:
    publish(
        DomainEvent(
            event_type=event_type,
            resource_type=resource_type,
            workspace_id=workspace.id,
            resource_id=workspace.id if resource_id is None else resource_id,
            actor_id=actor.id,
            metadata=metadata or {},
        )
    )


def test_filters_by_actor_and_event_type(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
) -> None:
    publish_activity(
        workspace,
        workspace.owner,
        event_type=ActivityEventType.PROJECT_CREATED,
        resource_type=ActivityResourceType.PROJECT,
    )
    publish_activity(
        workspace,
        other_user,
        event_type=ActivityEventType.TASK_CREATED,
        resource_type=ActivityResourceType.TASK,
    )

    feed = get_filtered_feed(
        client,
        workspace,
        actor_id=str(other_user.id),
        event_type="task_created",
    )

    assert feed["count"] == 1
    assert feed["items"][0]["actor"]["email"] == other_user.email
    assert feed["items"][0]["event"] == "task_created"


def test_filters_by_period(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
) -> None:
    publish_activity(
        workspace,
        workspace.owner,
        event_type=ActivityEventType.PROJECT_CREATED,
        resource_type=ActivityResourceType.PROJECT,
        metadata={"name": "Recent"},
    )
    publish_activity(
        workspace,
        workspace.owner,
        event_type=ActivityEventType.PROJECT_UPDATED,
        resource_type=ActivityResourceType.PROJECT,
        metadata={"name": "Old"},
    )
    old_activity = database_session.scalar(
        select(Activity).where(Activity.activity_metadata["name"].astext == "Old")
    )
    assert old_activity is not None
    old_activity.created_at = datetime.now(timezone.utc) - timedelta(days=8)
    database_session.commit()

    today = get_filtered_feed(client, workspace, period="today")
    week = get_filtered_feed(client, workspace, period="week")
    month = get_filtered_feed(client, workspace, period="month")

    assert today["count"] == 1
    assert week["count"] == 1
    assert month["count"] == 2


def test_full_text_searches_actor_message_metadata_and_workspace(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    publish_activity(
        workspace,
        workspace.owner,
        event_type=ActivityEventType.TASK_CREATED,
        resource_type=ActivityResourceType.TASK,
        metadata={"title": "Critical dashboard"},
    )

    for search in (
        workspace.owner.full_name,
        workspace.owner.email,
        "Tâche créée",
        "dashboard",
        workspace.name,
    ):
        feed = get_filtered_feed(client, workspace, search=search)
        assert feed["count"] == 1


def test_full_text_searches_project_name_without_metadata(
    client: TestClient,
    workspace: CreatedWorkspace,
    user: RegisteredUser,
    project_factory: ProjectFactory,
) -> None:
    project = project_factory.create(user, name="Searchable Roadmap")
    publish_activity(
        workspace,
        workspace.owner,
        event_type=ActivityEventType.PROJECT_UPDATED,
        resource_type=ActivityResourceType.PROJECT,
        resource_id=project.id,
    )

    feed = get_filtered_feed(client, workspace, search="roadmap")

    assert feed["count"] >= 1
    assert any(item["entity_id"] == str(project.id) for item in feed["items"])


def test_full_text_searches_parent_task_and_project(
    client: TestClient,
    workspace: CreatedWorkspace,
    user: RegisteredUser,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
) -> None:
    project = project_factory.create(user, name="Customer Portal")
    task = task_factory.create(project, title="Prepare launch notes")
    publish_activity(
        workspace,
        workspace.owner,
        event_type=ActivityEventType.COMMENT_CREATED,
        resource_type=ActivityResourceType.COMMENT,
        metadata={"task_id": str(task.id)},
    )

    task_feed = get_filtered_feed(client, workspace, search="launch notes")
    project_feed = get_filtered_feed(client, workspace, search="customer portal")

    assert any(item["resource"] == "comment" for item in task_feed["items"])
    assert any(item["resource"] == "comment" for item in project_feed["items"])
