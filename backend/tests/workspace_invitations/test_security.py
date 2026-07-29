from fastapi.testclient import TestClient
import pytest

from app.models.workspace_member import WorkspaceMemberRole
from tests.factories import (
    CreatedWorkspace,
    CreatedWorkspaceInvitation,
    RegisteredUser,
    UserFactory,
    WorkspaceInvitationFactory,
    WorkspaceMemberFactory,
)


def test_admin_can_create_list_and_revoke_invitation(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    user_factory: UserFactory,
    workspace_member_factory: WorkspaceMemberFactory,
    workspace_invitation_factory: WorkspaceInvitationFactory,
) -> None:
    admin = user_factory.create()
    workspace_member_factory.create(
        workspace,
        admin,
        role=WorkspaceMemberRole.ADMIN,
    )
    invitation = workspace_invitation_factory.create(
        workspace,
        other_user,
        actor=admin,
    )

    listed = client.get(
        f"/api/v1/workspaces/{workspace.id}/invitations",
        headers=admin.headers,
    )
    revoked = client.post(
        f"/api/v1/invitations/{invitation.token}/revoke",
        headers=admin.headers,
    )

    assert listed.status_code == 200
    assert listed.json()["items"][0]["id"] == str(invitation.id)
    assert revoked.status_code == 200
    assert revoked.json()["status"] == "revoked"


@pytest.mark.parametrize(
    "role",
    [WorkspaceMemberRole.MEMBER, WorkspaceMemberRole.VIEWER],
)
@pytest.mark.parametrize("operation", ["create", "list", "revoke"])
def test_member_and_viewer_cannot_manage_invitations(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    user_factory: UserFactory,
    workspace_member_factory: WorkspaceMemberFactory,
    workspace_invitation_factory: WorkspaceInvitationFactory,
    role: WorkspaceMemberRole,
    operation: str,
) -> None:
    actor = user_factory.create()
    workspace_member_factory.create(workspace, actor, role=role)
    invitation = workspace_invitation_factory.create(workspace, other_user)

    if operation == "create":
        response = client.post(
            f"/api/v1/workspaces/{workspace.id}/invitations",
            headers=actor.headers,
            json={"email": other_user.email, "role": "member"},
        )
    elif operation == "list":
        response = client.get(
            f"/api/v1/workspaces/{workspace.id}/invitations",
            headers=actor.headers,
        )
    else:
        response = client.post(
            f"/api/v1/invitations/{invitation.token}/revoke",
            headers=actor.headers,
        )

    assert response.status_code == 403
    assert response.json() == {"detail": "Insufficient permissions."}


@pytest.mark.parametrize("operation", ["create", "list", "revoke"])
def test_non_member_cannot_manage_foreign_workspace_invitations(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    workspace_invitation_factory: WorkspaceInvitationFactory,
    operation: str,
) -> None:
    invitation = workspace_invitation_factory.create(workspace, other_user)

    if operation == "create":
        response = client.post(
            f"/api/v1/workspaces/{workspace.id}/invitations",
            headers=other_user.headers,
            json={"email": other_user.email, "role": "member"},
        )
        expected_detail = "Workspace not found."
    elif operation == "list":
        response = client.get(
            f"/api/v1/workspaces/{workspace.id}/invitations",
            headers=other_user.headers,
        )
        expected_detail = "Workspace not found."
    else:
        response = client.post(
            f"/api/v1/invitations/{invitation.token}/revoke",
            headers=other_user.headers,
        )
        expected_detail = "Invitation not found."

    assert response.status_code == 404
    assert response.json() == {"detail": expected_detail}


def test_unrelated_user_cannot_read_invitation(
    client: TestClient,
    workspace_invitation: CreatedWorkspaceInvitation,
    user_factory: UserFactory,
) -> None:
    unrelated_user = user_factory.create()
    response = client.get(
        f"/api/v1/invitations/{workspace_invitation.token}",
        headers=unrelated_user.headers,
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Invitation not found."}


@pytest.mark.parametrize("operation", ["create", "list", "get", "accept", "revoke"])
def test_deleted_workspace_hides_invitations(
    client: TestClient,
    workspace_invitation: CreatedWorkspaceInvitation,
    other_user: RegisteredUser,
    operation: str,
) -> None:
    workspace = workspace_invitation.workspace
    deleted = client.delete(
        f"/api/v1/workspaces/{workspace.id}",
        headers=workspace.owner.headers,
    )
    assert deleted.status_code == 204

    if operation == "create":
        response = client.post(
            f"/api/v1/workspaces/{workspace.id}/invitations",
            headers=workspace.owner.headers,
            json={"email": other_user.email, "role": "member"},
        )
        expected_detail = "Workspace not found."
    elif operation == "list":
        response = client.get(
            f"/api/v1/workspaces/{workspace.id}/invitations",
            headers=workspace.owner.headers,
        )
        expected_detail = "Workspace not found."
    elif operation == "get":
        response = client.get(
            f"/api/v1/invitations/{workspace_invitation.token}",
            headers=other_user.headers,
        )
        expected_detail = "Invitation not found."
    elif operation == "accept":
        response = client.post(
            f"/api/v1/invitations/{workspace_invitation.token}/accept",
            headers=other_user.headers,
        )
        expected_detail = "Invitation not found."
    else:
        response = client.post(
            f"/api/v1/invitations/{workspace_invitation.token}/revoke",
            headers=workspace.owner.headers,
        )
        expected_detail = "Invitation not found."

    assert response.status_code == 404
    assert response.json() == {"detail": expected_detail}


@pytest.mark.parametrize("account_state", ["inactive", "deleted"])
@pytest.mark.parametrize("operation", ["create", "list", "revoke"])
def test_unavailable_owner_is_unauthorized(
    client: TestClient,
    workspace_invitation: CreatedWorkspaceInvitation,
    other_user: RegisteredUser,
    user_factory: UserFactory,
    account_state: str,
    operation: str,
) -> None:
    owner = workspace_invitation.workspace.owner
    if account_state == "inactive":
        user_factory.set_active(owner, is_active=False)
    else:
        user_factory.delete(owner)

    if operation == "create":
        response = client.post(
            f"/api/v1/workspaces/{workspace_invitation.workspace.id}/invitations",
            headers=owner.headers,
            json={"email": other_user.email, "role": "member"},
        )
    elif operation == "list":
        response = client.get(
            f"/api/v1/workspaces/{workspace_invitation.workspace.id}/invitations",
            headers=owner.headers,
        )
    else:
        response = client.post(
            f"/api/v1/invitations/{workspace_invitation.token}/revoke",
            headers=owner.headers,
        )

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


@pytest.mark.parametrize("account_state", ["inactive", "deleted"])
def test_unavailable_invitee_cannot_accept(
    client: TestClient,
    workspace_invitation: CreatedWorkspaceInvitation,
    other_user: RegisteredUser,
    user_factory: UserFactory,
    account_state: str,
) -> None:
    if account_state == "inactive":
        user_factory.set_active(other_user, is_active=False)
    else:
        user_factory.delete(other_user)

    response = client.post(
        f"/api/v1/invitations/{workspace_invitation.token}/accept",
        headers=other_user.headers,
    )

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


@pytest.mark.parametrize("operation", ["create", "list", "get", "accept", "revoke"])
def test_missing_token_is_unauthorized(
    client: TestClient,
    workspace_invitation: CreatedWorkspaceInvitation,
    other_user: RegisteredUser,
    operation: str,
) -> None:
    if operation == "create":
        response = client.post(
            f"/api/v1/workspaces/{workspace_invitation.workspace.id}/invitations",
            json={"email": other_user.email, "role": "member"},
        )
    elif operation == "list":
        response = client.get(
            f"/api/v1/workspaces/{workspace_invitation.workspace.id}/invitations"
        )
    elif operation == "get":
        response = client.get(f"/api/v1/invitations/{workspace_invitation.token}")
    elif operation == "accept":
        response = client.post(
            f"/api/v1/invitations/{workspace_invitation.token}/accept"
        )
    else:
        response = client.post(
            f"/api/v1/invitations/{workspace_invitation.token}/revoke"
        )

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"
