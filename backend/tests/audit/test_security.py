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
    [WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN],
)
def test_owner_and_admin_can_read_audit(
    client: TestClient,
    workspace: CreatedWorkspace,
    user: RegisteredUser,
    user_factory: UserFactory,
    project_factory: ProjectFactory,
    workspace_member_factory: WorkspaceMemberFactory,
    role: WorkspaceMemberRole,
) -> None:
    if role == WorkspaceMemberRole.OWNER:
        actor = workspace.owner
    else:
        actor = user_factory.create()
        workspace_member_factory.create(workspace, actor, role=role)
    project_factory.create(user)

    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/audit",
        headers=actor.headers,
    )

    assert response.status_code == 200
    assert response.json()["count"] == 1


@pytest.mark.parametrize(
    "role",
    [WorkspaceMemberRole.MEMBER, WorkspaceMemberRole.VIEWER],
)
def test_member_and_viewer_receive_403(
    client: TestClient,
    workspace: CreatedWorkspace,
    user_factory: UserFactory,
    workspace_member_factory: WorkspaceMemberFactory,
    role: WorkspaceMemberRole,
) -> None:
    actor = user_factory.create()
    workspace_member_factory.create(workspace, actor, role=role)

    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/audit",
        headers=actor.headers,
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "Insufficient permissions."}


def test_foreign_workspace_audit_is_hidden(
    client: TestClient,
    user: RegisteredUser,
    other_user: RegisteredUser,
    workspace_factory: WorkspaceFactory,
) -> None:
    foreign_workspace = workspace_factory.create(other_user)

    response = client.get(
        f"/api/v1/workspaces/{foreign_workspace.id}/audit",
        headers=user.headers,
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Workspace not found."}


def test_deleted_workspace_audit_is_hidden(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    deleted = client.delete(
        f"/api/v1/workspaces/{workspace.id}",
        headers=workspace.owner.headers,
    )
    assert deleted.status_code == 204

    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/audit",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Workspace not found."}


@pytest.mark.parametrize("account_state", ["inactive", "deleted"])
def test_unavailable_user_is_unauthorized(
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
        f"/api/v1/workspaces/{workspace.id}/audit",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_missing_token_is_unauthorized(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    response = client.get(f"/api/v1/workspaces/{workspace.id}/audit")

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"
