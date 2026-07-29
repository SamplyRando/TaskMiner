from dataclasses import dataclass
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.workspace_member import WorkspaceMember, WorkspaceMemberRole
from tests.factories.users import RegisteredUser
from tests.factories.workspaces import CreatedWorkspace


@dataclass(frozen=True)
class CreatedWorkspaceMember:
    id: UUID
    workspace: CreatedWorkspace
    user: RegisteredUser
    role: WorkspaceMemberRole


class WorkspaceMemberFactory:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(
        self,
        workspace: CreatedWorkspace,
        user: RegisteredUser,
        *,
        role: WorkspaceMemberRole = WorkspaceMemberRole.MEMBER,
    ) -> CreatedWorkspaceMember:
        member = WorkspaceMember(
            workspace_id=workspace.id,
            user_id=user.id,
            role=role,
        )
        self.session.add(member)
        self.session.commit()
        self.session.refresh(member)
        return CreatedWorkspaceMember(
            id=member.id,
            workspace=workspace,
            user=user,
            role=member.role,
        )
