from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from tests.factories import (
    CreatedWorkspace,
    ProjectFactory,
    RegisteredUser,
    TaskFactory,
)


def get_audit(
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


def test_project_creation_automatically_adds_audit_log(
    client: TestClient,
    workspace: CreatedWorkspace,
    user: RegisteredUser,
    project_factory: ProjectFactory,
) -> None:
    project = project_factory.create(user, name="Audited project")

    data = get_audit(client, workspace)

    assert data["count"] == 1
    item = data["items"][0]
    assert item["event"] == "project_created"
    assert item["resource"] == "project"
    assert item["resource_id"] == str(project.id)
    assert item["actor_id"] == str(user.id)
    assert item["old_values"] is None
    assert item["new_values"] == {
        "description": "Test project description",
        "name": "Audited project",
    }
    assert item["metadata"] == {"name": "Audited project"}
    assert item["workspace_id"] == str(workspace.id)
    assert item["workspace_name"] == workspace.name
    assert item["actor"] == {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
    }
    assert item["message"] == "Projet créé : Audited project"
    assert item["success"] is True
    assert set(item) == {
        "id",
        "workspace_id",
        "workspace_name",
        "actor",
        "event",
        "resource",
        "resource_id",
        "actor_id",
        "old_values",
        "new_values",
        "metadata",
        "message",
        "success",
        "created_at",
    }


def test_audit_logs_are_sorted_newest_first(
    client: TestClient,
    workspace: CreatedWorkspace,
    user: RegisteredUser,
    project_factory: ProjectFactory,
    database_session: Session,
) -> None:
    project_factory.create(user, name="First")
    project_factory.create(user, name="Second")
    logs = list(database_session.scalars(select(AuditLog)).all())
    first = next(log for log in logs if log.audit_metadata["name"] == "First")
    second = next(log for log in logs if log.audit_metadata["name"] == "Second")
    now = datetime.now(timezone.utc)
    first.created_at = now - timedelta(minutes=1)
    second.created_at = now
    database_session.commit()

    data = get_audit(client, workspace)

    assert [item["metadata"]["name"] for item in data["items"]] == [
        "Second",
        "First",
    ]


def test_audit_pagination_preserves_filtered_count(
    client: TestClient,
    workspace: CreatedWorkspace,
    user: RegisteredUser,
    project_factory: ProjectFactory,
) -> None:
    for index in range(5):
        project_factory.create(user, name=f"Project {index}")

    first_page = get_audit(client, workspace, offset=0, limit=2)
    second_page = get_audit(client, workspace, offset=2, limit=2)

    assert first_page["count"] == 5
    assert second_page["count"] == 5
    assert len(first_page["items"]) == 2
    assert len(second_page["items"]) == 2
    assert {item["id"] for item in first_page["items"]}.isdisjoint(
        {item["id"] for item in second_page["items"]}
    )


def test_audit_filters_by_event_type(
    client: TestClient,
    workspace: CreatedWorkspace,
    user: RegisteredUser,
    project_factory: ProjectFactory,
) -> None:
    project = project_factory.create(user)
    deleted = client.delete(
        f"/api/v1/projects/{project.id}",
        headers=user.headers,
    )
    assert deleted.status_code == 204

    data = get_audit(client, workspace, event_type="project_deleted")

    assert data["count"] == 1
    assert [item["event"] for item in data["items"]] == ["project_deleted"]


def test_audit_filters_by_resource_type(
    client: TestClient,
    workspace: CreatedWorkspace,
    user: RegisteredUser,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
) -> None:
    project = project_factory.create(user)
    task_factory.create(project)

    data = get_audit(client, workspace, resource_type="task")

    assert data["count"] == 1
    assert data["items"][0]["resource"] == "task"


def test_audit_combines_event_and_resource_filters(
    client: TestClient,
    workspace: CreatedWorkspace,
    user: RegisteredUser,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
) -> None:
    project = project_factory.create(user)
    task = task_factory.create(project)
    updated = client.patch(
        f"/api/v1/tasks/{task.id}",
        headers=user.headers,
        json={"title": "Updated title"},
    )
    assert updated.status_code == 200

    data = get_audit(
        client,
        workspace,
        event_type="task_updated",
        resource_type="task",
    )

    assert data["count"] == 1
    item = data["items"][0]
    assert item["old_values"] == {"title": task.title}
    assert item["new_values"] == {"title": "Updated title"}


def test_empty_audit_feed(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    assert get_audit(client, workspace) == {"items": [], "count": 0}
