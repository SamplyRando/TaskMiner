from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import cast
from uuid import UUID

from fastapi.testclient import TestClient

from app.database.database import SessionLocal
from app.models.workspace_invitation import WorkspaceInvitation
from app.models.workspace_member import WorkspaceMemberRole
from tests.factories.users import RegisteredUser
from tests.factories.workspaces import CreatedWorkspace


@dataclass(frozen=True)
class CreatedWorkspaceInvitation:
    id: UUID
    token: str
    email: str
    role: WorkspaceMemberRole
    workspace: CreatedWorkspace


class WorkspaceInvitationFactory:
    def __init__(self, client: TestClient) -> None:
        self.client = client

    def create(
        self,
        workspace: CreatedWorkspace,
        invited_user: RegisteredUser,
        *,
        role: WorkspaceMemberRole = WorkspaceMemberRole.MEMBER,
        actor: RegisteredUser | None = None,
    ) -> CreatedWorkspaceInvitation:
        response = self.client.post(
            f"/api/v1/workspaces/{workspace.id}/invitations",
            headers=(actor or workspace.owner).headers,
            json={"email": invited_user.email, "role": role.value},
        )
        assert response.status_code == 201, response.text

        data = cast(dict[str, object], response.json())
        return CreatedWorkspaceInvitation(
            id=UUID(str(data["id"])),
            token=str(data["token"]),
            email=invited_user.email,
            role=role,
            workspace=workspace,
        )

    def expire(self, invitation: CreatedWorkspaceInvitation) -> None:
        with SessionLocal() as session:
            database_invitation = session.get(WorkspaceInvitation, invitation.id)
            assert database_invitation is not None
            database_invitation.expires_at = datetime.now(timezone.utc) - timedelta(
                seconds=1
            )
            session.commit()
