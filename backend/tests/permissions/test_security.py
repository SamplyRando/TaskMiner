from uuid import uuid4

from fastapi.testclient import TestClient
import pytest

from app.models.workspace_member import WorkspaceMemberRole
from tests.factories import (
    CreatedWorkspace,
    CreatedWorkspaceMember,
    RegisteredUser,
    UserFactory,
    WorkspaceFactory,
    WorkspaceMemberFactory,
)


def test_foreign_workspace_permissions_are_hidden(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
) -> None:
    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/permissions",
        headers=other_user.headers,
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Workspace not found."}


def test_foreign_workspace_role_update_is_hidden(
    client: TestClient,
    workspace_member: CreatedWorkspaceMember,
    other_user: RegisteredUser,
) -> None:
    response = client.patch(
        "/api/v1/workspaces/"
        f"{workspace_member.workspace.id}/members/{workspace_member.id}/role",
        headers=other_user.headers,
        json={"role": "viewer"},
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "Insufficient permissions."}


def test_non_member_role_update_is_hidden(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
) -> None:
    response = client.patch(
        f"/api/v1/workspaces/{workspace.id}/members/{uuid4()}/role",
        headers=other_user.headers,
        json={"role": "viewer"},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Workspace not found."}


def test_member_from_another_workspace_is_hidden(
    client: TestClient,
    user: RegisteredUser,
    other_user: RegisteredUser,
    workspace_factory: WorkspaceFactory,
    workspace_member_factory: WorkspaceMemberFactory,
) -> None:
    first_workspace = workspace_factory.create(user)
    second_workspace = workspace_factory.create(user)
    foreign_member = workspace_member_factory.create(second_workspace, other_user)

    response = client.patch(
        f"/api/v1/workspaces/{first_workspace.id}/members/{foreign_member.id}/role",
        headers=user.headers,
        json={"role": "viewer"},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Workspace member not found."}


@pytest.mark.parametrize(
    "role",
    [
        WorkspaceMemberRole.ADMIN,
        WorkspaceMemberRole.MEMBER,
        WorkspaceMemberRole.VIEWER,
    ],
)
def test_only_owner_can_update_roles(
    client: TestClient,
    workspace: CreatedWorkspace,
    user_factory: UserFactory,
    workspace_member_factory: WorkspaceMemberFactory,
    role: WorkspaceMemberRole,
) -> None:
    actor = user_factory.create()
    target = user_factory.create()
    workspace_member_factory.create(workspace, actor, role=role)
    target_member = workspace_member_factory.create(workspace, target)

    response = client.patch(
        f"/api/v1/workspaces/{workspace.id}/members/{target_member.id}/role",
        headers=actor.headers,
        json={"role": "viewer"},
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "Insufficient permissions."}


@pytest.mark.parametrize("endpoint", ["permissions", "role"])
def test_deleted_workspace_is_hidden(
    client: TestClient,
    workspace_member: CreatedWorkspaceMember,
    endpoint: str,
) -> None:
    deleted = client.delete(
        f"/api/v1/workspaces/{workspace_member.workspace.id}",
        headers=workspace_member.workspace.owner.headers,
    )
    assert deleted.status_code == 204

    if endpoint == "permissions":
        response = client.get(
            f"/api/v1/workspaces/{workspace_member.workspace.id}/permissions",
            headers=workspace_member.workspace.owner.headers,
        )
    else:
        response = client.patch(
            "/api/v1/workspaces/"
            f"{workspace_member.workspace.id}/members/"
            f"{workspace_member.id}/role",
            headers=workspace_member.workspace.owner.headers,
            json={"role": "viewer"},
        )

    assert response.status_code == 404
    assert response.json() == {"detail": "Workspace not found."}


@pytest.mark.parametrize("account_state", ["inactive", "deleted"])
@pytest.mark.parametrize("endpoint", ["permissions", "role"])
def test_unavailable_user_is_unauthorized(
    client: TestClient,
    workspace_member: CreatedWorkspaceMember,
    user_factory: UserFactory,
    account_state: str,
    endpoint: str,
) -> None:
    owner = workspace_member.workspace.owner
    if account_state == "inactive":
        user_factory.set_active(owner, is_active=False)
    else:
        user_factory.delete(owner)

    if endpoint == "permissions":
        response = client.get(
            f"/api/v1/workspaces/{workspace_member.workspace.id}/permissions",
            headers=owner.headers,
        )
    else:
        response = client.patch(
            "/api/v1/workspaces/"
            f"{workspace_member.workspace.id}/members/"
            f"{workspace_member.id}/role",
            headers=owner.headers,
            json={"role": "viewer"},
        )

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


@pytest.mark.parametrize("endpoint", ["permissions", "role"])
def test_missing_token_is_unauthorized(
    client: TestClient,
    workspace_member: CreatedWorkspaceMember,
    endpoint: str,
) -> None:
    if endpoint == "permissions":
        response = client.get(
            f"/api/v1/workspaces/{workspace_member.workspace.id}/permissions"
        )
    else:
        response = client.patch(
            "/api/v1/workspaces/"
            f"{workspace_member.workspace.id}/members/"
            f"{workspace_member.id}/role",
            json={"role": "viewer"},
        )

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"
