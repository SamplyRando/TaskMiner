from uuid import UUID

from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.repositories.workspace import WorkspaceRepository
from app.repositories.workspace_member import WorkspaceMemberRepository
from app.schemas.workspace_member import WorkspaceMemberList, WorkspaceMemberRead
from app.services.workspace import WorkspaceNotFoundError


class WorkspaceMemberNotFoundError(Exception):
    """Raised when a member does not belong to the requested workspace."""


class WorkspaceMemberService:
    """Application service for read-only workspace membership use cases."""

    def __init__(
        self,
        repository: WorkspaceMemberRepository,
        workspace_repository: WorkspaceRepository,
    ) -> None:
        self.repository = repository
        self.workspace_repository = workspace_repository

    def list_members(
        self,
        owner: User,
        workspace_id: UUID,
    ) -> WorkspaceMemberList:
        workspace = self._get_owned_workspace(owner, workspace_id)
        members = self.repository.list_by_workspace(workspace)
        return WorkspaceMemberList(
            items=[WorkspaceMemberRead.model_validate(member) for member in members]
        )

    def get_member(
        self,
        owner: User,
        workspace_id: UUID,
        member_id: UUID,
    ) -> WorkspaceMember:
        workspace = self._get_owned_workspace(owner, workspace_id)
        member = self.repository.get_by_id(workspace, member_id)
        if member is None:
            raise WorkspaceMemberNotFoundError
        return member

    def _get_owned_workspace(self, owner: User, workspace_id: UUID) -> Workspace:
        workspace = self.workspace_repository.get_by_id_for_owner(
            workspace_id,
            owner,
        )
        if workspace is None:
            raise WorkspaceNotFoundError
        return workspace
