from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING, Callable
from uuid import UUID

from app.models.user import User
from app.models.workspace import Workspace
from app.repositories.workspace import WorkspaceRepository
from app.schemas.workspace import (
    RecoverableWorkspaceRead,
    WorkspaceCreate,
    WorkspaceUpdate,
)
from app.core.events import (
    ActivityEventType,
    ActivityResourceType,
    DomainEvent,
    publish,
)

if TYPE_CHECKING:
    from app.services.subscription import SubscriptionService


class WorkspaceNotFoundError(Exception):
    """Raised when a workspace is inaccessible to the current owner."""


class WorkspaceRecoveryExpiredError(Exception):
    """Raised when a deleted workspace is outside the recovery window."""


class WorkspaceService:
    """Application service for workspace use cases."""

    def __init__(
        self,
        repository: WorkspaceRepository,
        subscription_service: SubscriptionService,
        clock: Callable[[], datetime] | None = None,
    ) -> None:
        self.repository = repository
        self.subscription_service = subscription_service
        self.clock = clock or (lambda: datetime.now(timezone.utc))

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

    def list_recoverable_workspaces(
        self,
        owner: User,
    ) -> list[RecoverableWorkspaceRead]:
        cutoff = self.clock() - timedelta(days=30)
        return [
            RecoverableWorkspaceRead(
                id=workspace.id,
                name=workspace.name,
                description=workspace.description,
                deleted_at=workspace.deleted_at,
                recoverable_until=workspace.deleted_at + timedelta(days=30),
            )
            for workspace in self.repository.list_recoverable_by_owner(owner, cutoff)
            if workspace.deleted_at is not None
        ]

    def restore_workspace(self, owner: User, workspace_id: UUID) -> Workspace:
        workspace = self.repository.get_deleted_by_id_for_owner(workspace_id, owner)
        if workspace is None:
            raise WorkspaceNotFoundError
        assert workspace.deleted_at is not None
        if workspace.deleted_at < self.clock() - timedelta(days=30):
            raise WorkspaceRecoveryExpiredError
        self.subscription_service.enforce_owned_workspace_limit(owner.id)
        restored = self.repository.restore(workspace)
        publish(
            DomainEvent(
                event_type=ActivityEventType.WORKSPACE_UPDATED,
                resource_type=ActivityResourceType.WORKSPACE,
                workspace_id=restored.id,
                resource_id=restored.id,
                actor_id=owner.id,
                metadata={"source": "workspace_restore"},
            )
        )
        return restored
