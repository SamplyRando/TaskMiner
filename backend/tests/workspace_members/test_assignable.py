from fastapi.testclient import TestClient
import pytest

from app.models.workspace_member import WorkspaceMemberRole
from tests.factories import (
    CreatedWorkspace,
    RegisteredUser,
    UserFactory,
    WorkspaceFactory,
    WorkspaceMemberFactory,
)


def test_assignable_members_only_contains_active_workspace_members(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    user_factory: UserFactory,
    workspace_member_factory: WorkspaceMemberFactory,
) -> None:
    workspace_member_factory.create(workspace, other_user)
    outsider = user_factory.create()
    inactive_member = user_factory.create()
    workspace_member_factory.create(workspace, inactive_member)
    user_factory.set_active(inactive_member, is_active=False)

    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/assignable-members",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 200
    items = response.json()["items"]
    listed_user_ids = {item["user_id"] for item in items}
    assert listed_user_ids == {str(workspace.owner.id), str(other_user.id)}
    assert str(outsider.id) not in listed_user_ids
    assert str(inactive_member.id) not in listed_user_ids
    listed_member = next(
        item for item in items if item["user_id"] == str(other_user.id)
    )
    assert listed_member == {
        "email": other_user.email,
        "full_name": other_user.full_name,
        "role": "member",
        "user_id": str(other_user.id),
    }


@pytest.mark.parametrize(
    "role",
    [WorkspaceMemberRole.ADMIN, WorkspaceMemberRole.MEMBER],
)
def test_workspace_task_manager_can_list_assignable_members(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    workspace_member_factory: WorkspaceMemberFactory,
    role: WorkspaceMemberRole,
) -> None:
    workspace_member_factory.create(workspace, other_user, role=role)

    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/assignable-members",
        headers=other_user.headers,
    )

    assert response.status_code == 200
    assert {item["user_id"] for item in response.json()["items"]} == {
        str(workspace.owner.id),
        str(other_user.id),
    }


def test_viewer_cannot_list_assignable_members(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    workspace_member_factory: WorkspaceMemberFactory,
) -> None:
    workspace_member_factory.create(
        workspace,
        other_user,
        role=WorkspaceMemberRole.VIEWER,
    )

    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/assignable-members",
        headers=other_user.headers,
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "Insufficient permissions."}


def test_foreign_workspace_hides_assignable_members(
    client: TestClient,
    user: RegisteredUser,
    other_user: RegisteredUser,
    workspace_factory: WorkspaceFactory,
) -> None:
    foreign_workspace = workspace_factory.create(other_user)

    response = client.get(
        f"/api/v1/workspaces/{foreign_workspace.id}/assignable-members",
        headers=user.headers,
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Workspace not found."}
