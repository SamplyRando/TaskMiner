from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi.testclient import TestClient

from app.models.workspace_member import WorkspaceMemberRole
from tests.factories import (
    CreatedWorkspace,
    CreatedWorkspaceInvitation,
    RegisteredUser,
    UserFactory,
    WorkspaceInvitationFactory,
)


def test_owner_creates_invitation(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
) -> None:
    before = datetime.now(timezone.utc)

    response = client.post(
        f"/api/v1/workspaces/{workspace.id}/invitations",
        headers=workspace.owner.headers,
        json={"email": other_user.email.upper(), "role": "member"},
    )

    after = datetime.now(timezone.utc)
    assert response.status_code == 201
    data = response.json()
    assert UUID(data["workspace_id"]) == workspace.id
    assert data["email"] == other_user.email
    assert data["role"] == "member"
    assert data["status"] == "pending"
    assert data["token"]
    assert data["accepted_at"] is None
    assert data["revoked_at"] is None
    expires_at = datetime.fromisoformat(data["expires_at"])
    assert before + timedelta(days=7) <= expires_at
    assert expires_at <= after + timedelta(days=7)
    assert set(data) == {
        "id",
        "workspace_id",
        "email",
        "role",
        "token",
        "status",
        "expires_at",
        "accepted_at",
        "revoked_at",
        "created_at",
        "updated_at",
    }


def test_owner_lists_invitations(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    user_factory: UserFactory,
    workspace_invitation_factory: WorkspaceInvitationFactory,
) -> None:
    first = workspace_invitation_factory.create(workspace, other_user)
    second_user = user_factory.create()
    second = workspace_invitation_factory.create(
        workspace,
        second_user,
        role=WorkspaceMemberRole.VIEWER,
    )

    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/invitations",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 200
    assert [item["id"] for item in response.json()["items"]] == [
        str(second.id),
        str(first.id),
    ]


def test_invited_user_reads_invitation_by_token(
    client: TestClient,
    workspace_invitation: CreatedWorkspaceInvitation,
    other_user: RegisteredUser,
) -> None:
    response = client.get(
        f"/api/v1/invitations/{workspace_invitation.token}",
        headers=other_user.headers,
    )

    assert response.status_code == 200
    assert response.json()["id"] == str(workspace_invitation.id)
    assert response.json()["token"] == workspace_invitation.token


def test_owner_reads_invitation_by_token(
    client: TestClient,
    workspace_invitation: CreatedWorkspaceInvitation,
) -> None:
    response = client.get(
        f"/api/v1/invitations/{workspace_invitation.token}",
        headers=workspace_invitation.workspace.owner.headers,
    )

    assert response.status_code == 200
    assert response.json()["status"] == "pending"


def test_invitation_tokens_are_unique(
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    workspace_invitation_factory: WorkspaceInvitationFactory,
) -> None:
    invitations = [
        workspace_invitation_factory.create(workspace, other_user) for _ in range(12)
    ]

    assert len({invitation.token for invitation in invitations}) == 12


def test_owner_revokes_invitation(
    client: TestClient,
    workspace_invitation: CreatedWorkspaceInvitation,
) -> None:
    response = client.post(
        f"/api/v1/invitations/{workspace_invitation.token}/revoke",
        headers=workspace_invitation.workspace.owner.headers,
    )

    assert response.status_code == 200
    assert response.json()["status"] == "revoked"
    assert response.json()["revoked_at"] is not None
    assert response.json()["accepted_at"] is None
    assert response.json()["token"] == workspace_invitation.token


def test_revoked_invitation_remains_in_list(
    client: TestClient,
    workspace_invitation: CreatedWorkspaceInvitation,
) -> None:
    revoke = client.post(
        f"/api/v1/invitations/{workspace_invitation.token}/revoke",
        headers=workspace_invitation.workspace.owner.headers,
    )
    assert revoke.status_code == 200

    response = client.get(
        f"/api/v1/workspaces/{workspace_invitation.workspace.id}/invitations",
        headers=workspace_invitation.workspace.owner.headers,
    )

    assert response.status_code == 200
    assert response.json()["items"][0]["status"] == "revoked"


def test_unknown_invitation_returns_404(
    client: TestClient,
    user: RegisteredUser,
) -> None:
    response = client.get(
        "/api/v1/invitations/unknown-cryptographic-token",
        headers=user.headers,
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Invitation not found."}
