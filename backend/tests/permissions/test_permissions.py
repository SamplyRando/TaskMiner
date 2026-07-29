from fastapi.testclient import TestClient
import pytest

from app.core import permissions
from app.models.workspace_member import WorkspaceMemberRole
from tests.factories import (
    CreatedWorkspace,
    RegisteredUser,
    WorkspaceMemberFactory,
)


EXPECTED_PERMISSIONS = {
    WorkspaceMemberRole.OWNER: {
        "manage_workspace": True,
        "manage_projects": True,
        "manage_tasks": True,
        "manage_members": True,
        "read": True,
    },
    WorkspaceMemberRole.ADMIN: {
        "manage_workspace": False,
        "manage_projects": True,
        "manage_tasks": True,
        "manage_members": False,
        "read": True,
    },
    WorkspaceMemberRole.MEMBER: {
        "manage_workspace": False,
        "manage_projects": False,
        "manage_tasks": True,
        "manage_members": False,
        "read": True,
    },
    WorkspaceMemberRole.VIEWER: {
        "manage_workspace": False,
        "manage_projects": False,
        "manage_tasks": False,
        "manage_members": False,
        "read": True,
    },
}


def test_owner_effective_permissions(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/permissions",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 200
    assert response.json() == {
        "role": "owner",
        "permissions": EXPECTED_PERMISSIONS[WorkspaceMemberRole.OWNER],
    }


@pytest.mark.parametrize(
    "role",
    [
        WorkspaceMemberRole.ADMIN,
        WorkspaceMemberRole.MEMBER,
        WorkspaceMemberRole.VIEWER,
    ],
)
def test_member_effective_permissions(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    workspace_member_factory: WorkspaceMemberFactory,
    role: WorkspaceMemberRole,
) -> None:
    workspace_member_factory.create(workspace, other_user, role=role)

    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/permissions",
        headers=other_user.headers,
    )

    assert response.status_code == 200
    assert response.json() == {
        "role": role.value,
        "permissions": EXPECTED_PERMISSIONS[role],
    }


@pytest.mark.parametrize("role", list(WorkspaceMemberRole))
def test_permission_helpers_follow_role_matrix(
    role: WorkspaceMemberRole,
) -> None:
    expected = EXPECTED_PERMISSIONS[role]

    assert permissions.can_view_workspace(role) is expected["read"]
    assert permissions.can_manage_workspace(role) is expected["manage_workspace"]
    assert permissions.can_manage_projects(role) is expected["manage_projects"]
    assert permissions.can_manage_tasks(role) is expected["manage_tasks"]
    assert permissions.can_manage_members(role) is expected["manage_members"]


@pytest.mark.parametrize(
    ("role", "expected"),
    [
        (WorkspaceMemberRole.OWNER, True),
        (WorkspaceMemberRole.ADMIN, True),
        (WorkspaceMemberRole.MEMBER, False),
        (WorkspaceMemberRole.VIEWER, False),
    ],
)
def test_project_permission_helpers(
    role: WorkspaceMemberRole,
    expected: bool,
) -> None:
    assert permissions.can_create_project(role) is expected
    assert permissions.can_update_project(role) is expected
    assert permissions.can_delete_project(role) is expected


@pytest.mark.parametrize(
    ("role", "expected"),
    [
        (WorkspaceMemberRole.OWNER, True),
        (WorkspaceMemberRole.ADMIN, True),
        (WorkspaceMemberRole.MEMBER, True),
        (WorkspaceMemberRole.VIEWER, False),
    ],
)
def test_contribution_permission_helpers(
    role: WorkspaceMemberRole,
    expected: bool,
) -> None:
    assert permissions.can_comment(role) is expected
    assert permissions.can_add_attachment(role) is expected
