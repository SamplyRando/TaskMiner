from uuid import UUID

from fastapi.testclient import TestClient
import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.workspace_member import WorkspaceMember, WorkspaceMemberRole
from tests.factories import (
    CreatedWorkspace,
    ProjectFactory,
    RegisteredUser,
    WorkspaceFactory,
)


def test_list_members_contains_workspace_owner(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/members",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    member = data["items"][0]
    assert UUID(member["workspace_id"]) == workspace.id
    assert UUID(member["user_id"]) == workspace.owner.id
    assert member["role"] == "owner"
    assert set(member) == {
        "id",
        "workspace_id",
        "user_id",
        "role",
        "created_at",
    }


def test_read_workspace_member(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    list_response = client.get(
        f"/api/v1/workspaces/{workspace.id}/members",
        headers=workspace.owner.headers,
    )
    member_id = list_response.json()["items"][0]["id"]

    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/members/{member_id}",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 200
    assert response.json()["id"] == member_id
    assert response.json()["user_id"] == str(workspace.owner.id)
    assert response.json()["role"] == "owner"


def test_member_lists_are_scoped_to_their_workspace(
    client: TestClient,
    user: RegisteredUser,
    workspace_factory: WorkspaceFactory,
) -> None:
    first_workspace = workspace_factory.create(user, name="First")
    second_workspace = workspace_factory.create(user, name="Second")

    first_response = client.get(
        f"/api/v1/workspaces/{first_workspace.id}/members",
        headers=user.headers,
    )
    second_response = client.get(
        f"/api/v1/workspaces/{second_workspace.id}/members",
        headers=user.headers,
    )

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    first_member = first_response.json()["items"][0]
    second_member = second_response.json()["items"][0]
    assert first_member["workspace_id"] == str(first_workspace.id)
    assert second_member["workspace_id"] == str(second_workspace.id)
    assert first_member["id"] != second_member["id"]


def test_default_workspace_created_for_project_has_owner_member(
    client: TestClient,
    user: RegisteredUser,
    project_factory: ProjectFactory,
) -> None:
    project_factory.create(user)
    workspace_response = client.get("/api/v1/workspaces", headers=user.headers)
    assert workspace_response.status_code == 200
    workspace_id = workspace_response.json()[0]["id"]

    response = client.get(
        f"/api/v1/workspaces/{workspace_id}/members",
        headers=user.headers,
    )

    assert response.status_code == 200
    assert response.json()["items"][0]["user_id"] == str(user.id)
    assert response.json()["items"][0]["role"] == "owner"


def test_workspace_user_membership_is_unique(
    workspace: CreatedWorkspace,
    database_session: Session,
) -> None:
    duplicate = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=workspace.owner.id,
        role=WorkspaceMemberRole.OWNER,
    )
    database_session.add(duplicate)

    with pytest.raises(IntegrityError):
        database_session.commit()
    database_session.rollback()
