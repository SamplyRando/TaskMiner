from fastapi.testclient import TestClient
import pytest

from app.models.workspace_member import WorkspaceMemberRole
from tests.factories import (
    CreatedWorkspace,
    CreatedWorkspaceMember,
    RegisteredUser,
    UserFactory,
    WorkspaceMemberFactory,
)


@pytest.mark.parametrize(
    ("initial_role", "new_role"),
    [
        (WorkspaceMemberRole.VIEWER, WorkspaceMemberRole.ADMIN),
        (WorkspaceMemberRole.ADMIN, WorkspaceMemberRole.MEMBER),
        (WorkspaceMemberRole.MEMBER, WorkspaceMemberRole.VIEWER),
        (WorkspaceMemberRole.VIEWER, WorkspaceMemberRole.MEMBER),
    ],
)
def test_owner_updates_member_role(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    workspace_member_factory: WorkspaceMemberFactory,
    initial_role: WorkspaceMemberRole,
    new_role: WorkspaceMemberRole,
) -> None:
    member = workspace_member_factory.create(
        workspace,
        other_user,
        role=initial_role,
    )

    response = client.patch(
        f"/api/v1/workspaces/{workspace.id}/members/{member.id}/role",
        headers=workspace.owner.headers,
        json={"role": new_role.value},
    )

    assert response.status_code == 200
    assert response.json()["role"] == new_role.value
    assert response.json()["user_id"] == str(other_user.id)


def test_role_update_is_persisted(
    client: TestClient,
    workspace_member: CreatedWorkspaceMember,
) -> None:
    response = client.patch(
        "/api/v1/workspaces/"
        f"{workspace_member.workspace.id}/members/{workspace_member.id}/role",
        headers=workspace_member.workspace.owner.headers,
        json={"role": "admin"},
    )
    assert response.status_code == 200

    detail = client.get(
        "/api/v1/workspaces/"
        f"{workspace_member.workspace.id}/members/{workspace_member.id}",
        headers=workspace_member.workspace.owner.headers,
    )

    assert detail.status_code == 200
    assert detail.json()["role"] == "admin"


def test_cannot_create_second_owner(
    client: TestClient,
    workspace_member: CreatedWorkspaceMember,
) -> None:
    response = client.patch(
        "/api/v1/workspaces/"
        f"{workspace_member.workspace.id}/members/{workspace_member.id}/role",
        headers=workspace_member.workspace.owner.headers,
        json={"role": "owner"},
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "A workspace can only have one owner."}


def test_owner_cannot_change_own_role(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    members = client.get(
        f"/api/v1/workspaces/{workspace.id}/members",
        headers=workspace.owner.headers,
    )
    owner_member_id = members.json()["items"][0]["id"]

    response = client.patch(
        f"/api/v1/workspaces/{workspace.id}/members/{owner_member_id}/role",
        headers=workspace.owner.headers,
        json={"role": "admin"},
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "You cannot change your own role."}


def test_role_update_with_same_value_is_idempotent(
    client: TestClient,
    workspace_member: CreatedWorkspaceMember,
) -> None:
    response = client.patch(
        "/api/v1/workspaces/"
        f"{workspace_member.workspace.id}/members/{workspace_member.id}/role",
        headers=workspace_member.workspace.owner.headers,
        json={"role": "member"},
    )

    assert response.status_code == 200
    assert response.json()["role"] == "member"


def test_new_users_do_not_gain_workspace_memberships_implicitly(
    client: TestClient,
    workspace: CreatedWorkspace,
    user_factory: UserFactory,
) -> None:
    user_factory.create()

    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/members",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 200
    assert len(response.json()["items"]) == 1
