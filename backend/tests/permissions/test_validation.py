from uuid import uuid4

from fastapi.testclient import TestClient
from pydantic import ValidationError
import pytest

from app.schemas.permissions import (
    WorkspacePermissionFlags,
    WorkspacePermissionsRead,
)
from app.schemas.workspace_member import WorkspaceMemberRoleUpdate
from tests.factories import CreatedWorkspaceMember


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"role": None},
        {"role": "manager"},
        {"role": "ADMIN"},
        {"role": "viewer", "unexpected": True},
    ],
)
def test_invalid_role_payload_returns_422(
    client: TestClient,
    workspace_member: CreatedWorkspaceMember,
    payload: dict[str, object],
) -> None:
    response = client.patch(
        "/api/v1/workspaces/"
        f"{workspace_member.workspace.id}/members/{workspace_member.id}/role",
        headers=workspace_member.workspace.owner.headers,
        json=payload,
    )

    assert response.status_code == 422


def test_invalid_workspace_uuid_returns_422(
    client: TestClient,
    workspace_member: CreatedWorkspaceMember,
) -> None:
    response = client.patch(
        f"/api/v1/workspaces/not-a-uuid/members/{workspace_member.id}/role",
        headers=workspace_member.workspace.owner.headers,
        json={"role": "viewer"},
    )

    assert response.status_code == 422


def test_invalid_member_uuid_returns_422(
    client: TestClient,
    workspace_member: CreatedWorkspaceMember,
) -> None:
    response = client.patch(
        f"/api/v1/workspaces/{workspace_member.workspace.id}/members/not-a-uuid/role",
        headers=workspace_member.workspace.owner.headers,
        json={"role": "viewer"},
    )

    assert response.status_code == 422


def test_invalid_permissions_workspace_uuid_returns_422(
    client: TestClient,
    workspace_member: CreatedWorkspaceMember,
) -> None:
    response = client.get(
        "/api/v1/workspaces/not-a-uuid/permissions",
        headers=workspace_member.workspace.owner.headers,
    )

    assert response.status_code == 422


def test_role_update_schema_forbids_extra_fields() -> None:
    with pytest.raises(ValidationError):
        WorkspaceMemberRoleUpdate.model_validate(
            {"role": "member", "workspace_id": uuid4()}
        )


def test_permissions_schema_forbids_extra_fields() -> None:
    with pytest.raises(ValidationError):
        WorkspacePermissionsRead.model_validate(
            {
                "role": "owner",
                "permissions": {
                    "manage_workspace": True,
                    "manage_projects": True,
                    "manage_tasks": True,
                    "manage_members": True,
                    "manage_invitations": True,
                    "read": True,
                },
                "unexpected": True,
            }
        )


def test_permission_flags_schema_forbids_extra_fields() -> None:
    with pytest.raises(ValidationError):
        WorkspacePermissionFlags.model_validate(
            {
                "manage_workspace": True,
                "manage_projects": True,
                "manage_tasks": True,
                "manage_members": True,
                "manage_invitations": True,
                "read": True,
                "unexpected": True,
            }
        )
