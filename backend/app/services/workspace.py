from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from app.models.user import User
from app.models.workspace import Workspace
from app.repositories.workspace import WorkspaceRepository
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate

if TYPE_CHECKING:
    from app.services.subscription import SubscriptionService


class WorkspaceNotFoundError(Exception):
    """Raised when a workspace is inaccessible to the current owner."""


class WorkspaceService:
    """Application service for workspace use cases."""

    def __init__(
        self,
        repository: WorkspaceRepository,
        subscription_service: SubscriptionService,
    ) -> None:
        self.repository = repository
        self.subscription_service = subscription_service

    def create_workspace(
        self,
        owner: User,
        data: WorkspaceCreate,
    ) -> Workspace:
        self.subscription_service.enforce_owned_workspace_limit(owner.id)
        return self.repository.create(owner, data)

    def list_workspaces(self, user: User) -> list[Workspace]:
        return self.repository.list_for_user(user)

    def get_workspace(self, user: User, workspace_id: UUID) -> Workspace:
        workspace = self.repository.get_for_user(workspace_id, user)
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
        self.subscription_service.enforce_workspace_deletion_allowed(workspace.id)
        self.repository.delete(workspace)
