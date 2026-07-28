from datetime import timedelta
from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.workspace import Workspace
from tests.factories import (
    CreatedWorkspace,
    ProjectFactory,
    RegisteredUser,
    WorkspaceFactory,
)


def test_create_workspace_for_authenticated_user(
    client: TestClient,
    user: RegisteredUser,
    database_session: Session,
) -> None:
    response = client.post(
        "/api/v1/workspaces",
        headers=user.headers,
        json={"name": "Engineering", "description": "Product engineering"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Engineering"
    assert data["description"] == "Product engineering"
    assert UUID(data["owner_id"]) == user.id
    assert "deleted_at" not in data

    stored_workspace = database_session.get(Workspace, UUID(data["id"]))
    assert stored_workspace is not None
    assert stored_workspace.owner_id == user.id
    assert stored_workspace.deleted_at is None


def test_list_workspaces_returns_only_current_user_workspaces(
    client: TestClient,
    user: RegisteredUser,
    other_user: RegisteredUser,
    workspace_factory: WorkspaceFactory,
) -> None:
    first = workspace_factory.create(user, name="First")
    second = workspace_factory.create(user, name="Second")
    workspace_factory.create(other_user, name="Foreign")

    response = client.get("/api/v1/workspaces", headers=user.headers)

    assert response.status_code == 200
    assert {item["id"] for item in response.json()} == {
        str(first.id),
        str(second.id),
    }


def test_read_workspace(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    response = client.get(
        f"/api/v1/workspaces/{workspace.id}",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 200
    assert response.json()["id"] == str(workspace.id)
    assert response.json()["name"] == workspace.name


def test_update_workspace_name_and_description(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    response = client.patch(
        f"/api/v1/workspaces/{workspace.id}",
        headers=workspace.owner.headers,
        json={"name": "Updated workspace", "description": None},
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Updated workspace"
    assert response.json()["description"] is None
    assert response.json()["owner_id"] == str(workspace.owner.id)


def test_empty_workspace_patch_keeps_values(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    response = client.patch(
        f"/api/v1/workspaces/{workspace.id}",
        headers=workspace.owner.headers,
        json={},
    )

    assert response.status_code == 200
    assert response.json()["name"] == workspace.name
    assert response.json()["description"] == workspace.description


def test_delete_workspace_soft_deletes_and_hides_it(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
) -> None:
    stored_before = database_session.get(Workspace, workspace.id)
    assert stored_before is not None
    created_at = stored_before.created_at
    updated_at = stored_before.updated_at

    delete_response = client.delete(
        f"/api/v1/workspaces/{workspace.id}",
        headers=workspace.owner.headers,
    )

    assert delete_response.status_code == 204
    assert delete_response.content == b""
    database_session.expire_all()
    deleted_workspace = database_session.get(Workspace, workspace.id)
    assert deleted_workspace is not None
    assert deleted_workspace.deleted_at is not None
    assert deleted_workspace.deleted_at.utcoffset() == timedelta(0)
    assert deleted_workspace.created_at == created_at
    assert deleted_workspace.updated_at >= updated_at

    read_response = client.get(
        f"/api/v1/workspaces/{workspace.id}",
        headers=workspace.owner.headers,
    )
    list_response = client.get(
        "/api/v1/workspaces",
        headers=workspace.owner.headers,
    )
    second_delete_response = client.delete(
        f"/api/v1/workspaces/{workspace.id}",
        headers=workspace.owner.headers,
    )

    assert read_response.status_code == 404
    assert list_response.status_code == 200
    assert list_response.json() == []
    assert second_delete_response.status_code == 404


def test_existing_project_endpoint_reuses_one_default_workspace(
    client: TestClient,
    user: RegisteredUser,
    project_factory: ProjectFactory,
    database_session: Session,
) -> None:
    first_project = project_factory.create(user, name="First project")
    second_project = project_factory.create(user, name="Second project")

    workspace_count = database_session.scalar(
        select(func.count(Workspace.id)).where(Workspace.owner_id == user.id)
    )
    first_model = database_session.get(Project, first_project.id)
    second_model = database_session.get(Project, second_project.id)

    assert workspace_count == 1
    assert first_model is not None
    assert second_model is not None
    assert first_model.workspace_id == second_model.workspace_id
    assert first_model.workspace.name == "My Workspace"

    response = client.get(
        f"/api/v1/projects/{first_project.id}",
        headers=user.headers,
    )
    assert response.status_code == 200
    assert response.json()["owner_id"] == str(user.id)
