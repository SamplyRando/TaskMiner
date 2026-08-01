from uuid import UUID

from app.models.user import User
from app.models.workspace import Workspace
from app.repositories.workspace import WorkspaceRepository
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate


class WorkspaceNotFoundError(Exception):
    """Raised when a workspace is inaccessible to the current owner."""


class WorkspaceService:
    """Application service for workspace use cases."""

    def __init__(self, repository: WorkspaceRepository) -> None:
        self.repository = repository

    def create_workspace(
        self,
        owner: User,
        data: WorkspaceCreate,
    ) -> Workspace:
        return self.repository.create(owner, data)

    def list_workspaces(self, user: User) -> list[Workspace]:
        return self.repository.list_for_user(user)

    def get_workspace(self, owner: User, workspace_id: UUID) -> Workspace:
        workspace = self.repository.get_by_id_for_owner(workspace_id, owner)
        if workspace is None:
            raise WorkspaceNotFoundError
        return workspace

    def update_workspace(
        self,
        owner: User,
        workspace_id: UUID,
        data: WorkspaceUpdate,
    ) -> Workspace:
        workspace = self.repository.get_by_id_for_owner(workspace_id, owner)
        if workspace is None:
            raise WorkspaceNotFoundError
        return self.repository.update(workspace, data)

    def delete_workspace(self, owner: User, workspace_id: UUID) -> None:
        workspace = self.repository.get_by_id_for_owner(workspace_id, owner)
        if workspace is None:
            raise WorkspaceNotFoundError
        self.repository.delete(workspace)
