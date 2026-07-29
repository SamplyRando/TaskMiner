from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.workspace_invitation import InvitationStatus, WorkspaceInvitation
from app.models.workspace_member import WorkspaceMember, WorkspaceMemberRole
from tests.factories import (
    CreatedWorkspace,
    CreatedWorkspaceInvitation,
    RegisteredUser,
    WorkspaceInvitationFactory,
    WorkspaceMemberFactory,
)


def test_invited_user_accepts_invitation(
    client: TestClient,
    workspace_invitation: CreatedWorkspaceInvitation,
    other_user: RegisteredUser,
    database_session: Session,
) -> None:
    response = client.post(
        f"/api/v1/invitations/{workspace_invitation.token}/accept",
        headers=other_user.headers,
    )

    assert response.status_code == 200
    assert response.json()["status"] == "accepted"
    assert response.json()["accepted_at"] is not None
    assert response.json()["revoked_at"] is None
    assert response.json()["token"] == workspace_invitation.token
    member = database_session.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_invitation.workspace.id,
            WorkspaceMember.user_id == other_user.id,
        )
    )
    assert member is not None
    assert member.role == WorkspaceMemberRole.MEMBER


def test_acceptance_uses_invited_role(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    workspace_invitation_factory: WorkspaceInvitationFactory,
    database_session: Session,
) -> None:
    invitation = workspace_invitation_factory.create(
        workspace,
        other_user,
        role=WorkspaceMemberRole.ADMIN,
    )

    response = client.post(
        f"/api/v1/invitations/{invitation.token}/accept",
        headers=other_user.headers,
    )

    assert response.status_code == 200
    member = database_session.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.user_id == other_user.id,
        )
    )
    assert member is not None
    assert member.role == WorkspaceMemberRole.ADMIN


def test_expired_invitation_cannot_be_accepted(
    client: TestClient,
    workspace_invitation: CreatedWorkspaceInvitation,
    other_user: RegisteredUser,
    workspace_invitation_factory: WorkspaceInvitationFactory,
    database_session: Session,
) -> None:
    workspace_invitation_factory.expire(workspace_invitation)

    response = client.post(
        f"/api/v1/invitations/{workspace_invitation.token}/accept",
        headers=other_user.headers,
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "Invitation has expired."}
    database_session.expire_all()
    invitation = database_session.get(WorkspaceInvitation, workspace_invitation.id)
    assert invitation is not None
    assert invitation.status == InvitationStatus.EXPIRED


def test_reading_expired_invitation_persists_expired_status(
    client: TestClient,
    workspace_invitation: CreatedWorkspaceInvitation,
    other_user: RegisteredUser,
    workspace_invitation_factory: WorkspaceInvitationFactory,
) -> None:
    workspace_invitation_factory.expire(workspace_invitation)

    response = client.get(
        f"/api/v1/invitations/{workspace_invitation.token}",
        headers=other_user.headers,
    )

    assert response.status_code == 200
    assert response.json()["status"] == "expired"


def test_listing_persists_expired_status(
    client: TestClient,
    workspace_invitation: CreatedWorkspaceInvitation,
    workspace_invitation_factory: WorkspaceInvitationFactory,
) -> None:
    workspace_invitation_factory.expire(workspace_invitation)

    response = client.get(
        f"/api/v1/workspaces/{workspace_invitation.workspace.id}/invitations",
        headers=workspace_invitation.workspace.owner.headers,
    )

    assert response.status_code == 200
    assert response.json()["items"][0]["status"] == "expired"


def test_revoked_invitation_cannot_be_accepted(
    client: TestClient,
    workspace_invitation: CreatedWorkspaceInvitation,
    other_user: RegisteredUser,
) -> None:
    revoked = client.post(
        f"/api/v1/invitations/{workspace_invitation.token}/revoke",
        headers=workspace_invitation.workspace.owner.headers,
    )
    assert revoked.status_code == 200

    response = client.post(
        f"/api/v1/invitations/{workspace_invitation.token}/accept",
        headers=other_user.headers,
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "Invitation has been revoked."}


def test_accepted_invitation_cannot_be_accepted_again(
    client: TestClient,
    workspace_invitation: CreatedWorkspaceInvitation,
    other_user: RegisteredUser,
) -> None:
    first = client.post(
        f"/api/v1/invitations/{workspace_invitation.token}/accept",
        headers=other_user.headers,
    )
    assert first.status_code == 200

    response = client.post(
        f"/api/v1/invitations/{workspace_invitation.token}/accept",
        headers=other_user.headers,
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "Invitation has already been accepted."}


def test_accepted_invitation_cannot_be_revoked(
    client: TestClient,
    workspace_invitation: CreatedWorkspaceInvitation,
    other_user: RegisteredUser,
) -> None:
    accepted = client.post(
        f"/api/v1/invitations/{workspace_invitation.token}/accept",
        headers=other_user.headers,
    )
    assert accepted.status_code == 200

    response = client.post(
        f"/api/v1/invitations/{workspace_invitation.token}/revoke",
        headers=workspace_invitation.workspace.owner.headers,
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "Accepted invitations cannot be revoked."}


def test_different_email_cannot_accept_invitation(
    client: TestClient,
    workspace_invitation: CreatedWorkspaceInvitation,
    user: RegisteredUser,
) -> None:
    response = client.post(
        f"/api/v1/invitations/{workspace_invitation.token}/accept",
        headers=user.headers,
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "This invitation belongs to another email address."
    }


def test_existing_member_cannot_accept_invitation(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    workspace_invitation_factory: WorkspaceInvitationFactory,
    workspace_member_factory: WorkspaceMemberFactory,
) -> None:
    invitation = workspace_invitation_factory.create(workspace, other_user)
    workspace_member_factory.create(workspace, other_user)

    response = client.post(
        f"/api/v1/invitations/{invitation.token}/accept",
        headers=other_user.headers,
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "User is already a workspace member."}


def test_expired_invitation_cannot_be_revoked(
    client: TestClient,
    workspace_invitation: CreatedWorkspaceInvitation,
    workspace_invitation_factory: WorkspaceInvitationFactory,
) -> None:
    workspace_invitation_factory.expire(workspace_invitation)

    response = client.post(
        f"/api/v1/invitations/{workspace_invitation.token}/revoke",
        headers=workspace_invitation.workspace.owner.headers,
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "Invitation has expired."}
