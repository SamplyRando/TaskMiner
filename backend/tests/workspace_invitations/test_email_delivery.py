from datetime import datetime, timedelta, timezone
import logging
from collections.abc import Generator
from typing import Literal
from uuid import UUID

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_email_provider
from app.email.provider import (
    EmailDeliveryResult,
    EmailMessage,
    EmailProviderError,
)
from app.main import app
from app.models.workspace_invitation import (
    InvitationEmailDeliveryStatus,
    InvitationStatus,
    WorkspaceInvitation,
)
from app.models.workspace_member import WorkspaceMember, WorkspaceMemberRole
from tests.factories import (
    CreatedWorkspace,
    CreatedWorkspaceInvitation,
    RegisteredUser,
    UserFactory,
    WorkspaceInvitationFactory,
    WorkspaceMemberFactory,
)


class CapturingEmailProvider:
    provider_name: Literal["resend"] = "resend"

    def __init__(self, *, fail: bool = False) -> None:
        self.fail = fail
        self.messages: list[EmailMessage] = []

    def send(self, message: EmailMessage) -> EmailDeliveryResult:
        self.messages.append(message)
        if self.fail:
            raise EmailProviderError("tests-only-provider-failure")
        return EmailDeliveryResult(delivered=True)


@pytest.fixture
def email_provider() -> Generator[CapturingEmailProvider, None, None]:
    provider = CapturingEmailProvider()
    app.dependency_overrides[get_email_provider] = lambda: provider
    yield provider
    app.dependency_overrides.pop(get_email_provider, None)


def allow_resend(
    database_session: Session,
    invitation_id: UUID,
) -> None:
    invitation = database_session.get(WorkspaceInvitation, invitation_id)
    assert invitation is not None
    invitation.email_last_attempted_at = datetime.now(timezone.utc) - timedelta(
        minutes=2
    )
    database_session.commit()


def test_creation_delivers_complete_invitation_email(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    email_provider: CapturingEmailProvider,
) -> None:
    response = client.post(
        f"/api/v1/workspaces/{workspace.id}/invitations",
        headers=workspace.owner.headers,
        json={"email": other_user.email.upper(), "role": "viewer"},
    )

    assert response.status_code == 201
    assert response.json()["email_delivery_status"] == "sent"
    assert response.json()["email_sent_at"] is not None
    assert len(email_provider.messages) == 1
    message = email_provider.messages[0]
    token = response.json()["token"]
    expected_url = f"http://localhost:3000/app/invitations?token={token}"
    assert message.recipient == other_user.email
    assert workspace.name in message.subject
    assert workspace.name in message.text
    assert workspace.owner.full_name in message.text
    assert workspace.owner.email in message.text
    assert "Lecteur" in message.text
    assert "expire" in message.text.lower()
    assert expected_url in message.text
    assert expected_url.replace("&", "&amp;") in message.html


def test_provider_failure_persists_invitation_without_leaking_token(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    database_session: Session,
    caplog: pytest.LogCaptureFixture,
) -> None:
    provider = CapturingEmailProvider(fail=True)
    app.dependency_overrides[get_email_provider] = lambda: provider
    try:
        with caplog.at_level(logging.WARNING):
            response = client.post(
                f"/api/v1/workspaces/{workspace.id}/invitations",
                headers=workspace.owner.headers,
                json={"email": other_user.email, "role": "member"},
            )
    finally:
        app.dependency_overrides.pop(get_email_provider, None)

    assert response.status_code == 502
    assert response.json() == {
        "detail": ("Invitation created, but email delivery failed. You can resend it.")
    }
    invitation = database_session.scalar(
        select(WorkspaceInvitation).where(
            WorkspaceInvitation.workspace_id == workspace.id,
            WorkspaceInvitation.email == other_user.email,
        )
    )
    assert invitation is not None
    assert invitation.status == InvitationStatus.PENDING
    assert invitation.email_delivery_status == InvitationEmailDeliveryStatus.FAILED
    assert invitation.token not in caplog.text
    assert "tests-only-provider-failure" not in response.text


def test_owner_resends_pending_invitation_without_corrupting_it(
    client: TestClient,
    workspace_invitation: CreatedWorkspaceInvitation,
    database_session: Session,
    email_provider: CapturingEmailProvider,
) -> None:
    allow_resend(database_session, workspace_invitation.id)

    response = client.post(
        f"/api/v1/workspaces/{workspace_invitation.workspace.id}/invitations/"
        f"{workspace_invitation.id}/resend",
        headers=workspace_invitation.workspace.owner.headers,
    )

    assert response.status_code == 200
    assert response.json()["id"] == str(workspace_invitation.id)
    assert response.json()["status"] == "pending"
    assert response.json()["email_delivery_status"] == "sent"
    assert len(email_provider.messages) == 1
    invitation_count = database_session.scalar(
        select(func.count(WorkspaceInvitation.id)).where(
            WorkspaceInvitation.id == workspace_invitation.id
        )
    )
    assert invitation_count == 1
    membership_count = database_session.scalar(
        select(func.count(WorkspaceMember.id)).where(
            WorkspaceMember.workspace_id == workspace_invitation.workspace.id
        )
    )
    assert membership_count == 1


def test_admin_can_resend_pending_invitation(
    client: TestClient,
    workspace_invitation: CreatedWorkspaceInvitation,
    database_session: Session,
    email_provider: CapturingEmailProvider,
    user_factory: UserFactory,
    workspace_member_factory: WorkspaceMemberFactory,
) -> None:
    admin = user_factory.create()
    workspace_member_factory.create(
        workspace_invitation.workspace,
        admin,
        role=WorkspaceMemberRole.ADMIN,
    )
    allow_resend(database_session, workspace_invitation.id)

    response = client.post(
        f"/api/v1/workspaces/{workspace_invitation.workspace.id}/invitations/"
        f"{workspace_invitation.id}/resend",
        headers=admin.headers,
    )

    assert response.status_code == 200
    assert response.json()["email_delivery_status"] == "sent"
    assert len(email_provider.messages) == 1


def test_resend_cooldown_blocks_rapid_repeated_delivery(
    client: TestClient,
    workspace_invitation: CreatedWorkspaceInvitation,
    email_provider: CapturingEmailProvider,
) -> None:
    response = client.post(
        f"/api/v1/workspaces/{workspace_invitation.workspace.id}/invitations/"
        f"{workspace_invitation.id}/resend",
        headers=workspace_invitation.workspace.owner.headers,
    )

    assert response.status_code == 429
    assert int(response.headers["Retry-After"]) >= 1
    assert email_provider.messages == []


@pytest.mark.parametrize(
    ("state", "expected_detail"),
    [
        ("accepted", "Accepted invitations cannot be resent."),
        ("revoked", "Invitation has been revoked."),
        ("expired", "Invitation has expired."),
    ],
)
def test_non_pending_invitation_cannot_be_resent(
    client: TestClient,
    workspace_invitation: CreatedWorkspaceInvitation,
    other_user: RegisteredUser,
    workspace_invitation_factory: WorkspaceInvitationFactory,
    state: str,
    expected_detail: str,
) -> None:
    if state == "accepted":
        transition = client.post(
            f"/api/v1/invitations/{workspace_invitation.token}/accept",
            headers=other_user.headers,
        )
        assert transition.status_code == 200
    elif state == "revoked":
        transition = client.post(
            f"/api/v1/invitations/{workspace_invitation.token}/revoke",
            headers=workspace_invitation.workspace.owner.headers,
        )
        assert transition.status_code == 200
    else:
        workspace_invitation_factory.expire(workspace_invitation)

    response = client.post(
        f"/api/v1/workspaces/{workspace_invitation.workspace.id}/invitations/"
        f"{workspace_invitation.id}/resend",
        headers=workspace_invitation.workspace.owner.headers,
    )

    assert response.status_code == 409
    assert response.json() == {"detail": expected_detail}


@pytest.mark.parametrize(
    "role",
    [WorkspaceMemberRole.MEMBER, WorkspaceMemberRole.VIEWER],
)
def test_member_and_viewer_cannot_resend_invitation(
    client: TestClient,
    workspace_invitation: CreatedWorkspaceInvitation,
    user_factory: UserFactory,
    workspace_member_factory: WorkspaceMemberFactory,
    role: WorkspaceMemberRole,
) -> None:
    actor = user_factory.create()
    workspace_member_factory.create(
        workspace_invitation.workspace,
        actor,
        role=role,
    )

    response = client.post(
        f"/api/v1/workspaces/{workspace_invitation.workspace.id}/invitations/"
        f"{workspace_invitation.id}/resend",
        headers=actor.headers,
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "Insufficient permissions."}


def test_outsider_cannot_resend_invitation(
    client: TestClient,
    workspace_invitation: CreatedWorkspaceInvitation,
    user_factory: UserFactory,
) -> None:
    outsider = user_factory.create()
    response = client.post(
        f"/api/v1/workspaces/{workspace_invitation.workspace.id}/invitations/"
        f"{workspace_invitation.id}/resend",
        headers=outsider.headers,
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Invitation not found."}
