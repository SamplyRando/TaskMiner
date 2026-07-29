from fastapi.testclient import TestClient
import pytest

from app.models.workspace_member import WorkspaceMemberRole
from tests.factories import (
    CreatedWorkspace,
    ProjectFactory,
    RegisteredUser,
    UserFactory,
    WorkspaceFactory,
    WorkspaceMemberFactory,
)


@pytest.mark.parametrize(
    "role",
    [
        WorkspaceMemberRole.ADMIN,
        WorkspaceMemberRole.MEMBER,
        WorkspaceMemberRole.VIEWER,
    ],
)
def test_all_workspace_member_roles_can_read_feed(
    client: TestClient,
    workspace: CreatedWorkspace,
    user: RegisteredUser,
    user_factory: UserFactory,
    project_factory: ProjectFactory,
    workspace_member_factory: WorkspaceMemberFactory,
    role: WorkspaceMemberRole,
) -> None:
    member_user = user_factory.create()
    workspace_member_factory.create(workspace, member_user, role=role)
    project_factory.create(user)

    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/activities",
        headers=member_user.headers,
    )

    assert response.status_code == 200
    assert response.json()["count"] == 1


def test_workspace_owner_can_read_feed(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/activities",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 200


def test_foreign_workspace_feed_is_hidden(
    client: TestClient,
    user: RegisteredUser,
    other_user: RegisteredUser,
    workspace_factory: WorkspaceFactory,
) -> None:
    foreign_workspace = workspace_factory.create(other_user)

    response = client.get(
        f"/api/v1/workspaces/{foreign_workspace.id}/activities",
        headers=user.headers,
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Workspace not found."}


def test_deleted_workspace_feed_is_hidden(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    deleted = client.delete(
        f"/api/v1/workspaces/{workspace.id}",
        headers=workspace.owner.headers,
    )
    assert deleted.status_code == 204

    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/activities",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Workspace not found."}


@pytest.mark.parametrize("account_state", ["inactive", "deleted"])
def test_unavailable_user_cannot_read_feed(
    client: TestClient,
    workspace: CreatedWorkspace,
    user_factory: UserFactory,
    account_state: str,
) -> None:
    if account_state == "inactive":
        user_factory.set_active(workspace.owner, is_active=False)
    else:
        user_factory.delete(workspace.owner)

    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/activities",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_missing_token_returns_401(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    response = client.get(f"/api/v1/workspaces/{workspace.id}/activities")

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"
