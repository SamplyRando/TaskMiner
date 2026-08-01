from uuid import UUID

from app.core import permissions
from app.core.events import (
    ActivityEventType,
    ActivityResourceType,
    DomainEvent,
    publish,
)
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember, WorkspaceMemberRole
from app.repositories.workspace import WorkspaceRepository
from app.repositories.workspace_member import WorkspaceMemberRepository
from app.schemas.permissions import (
    WorkspacePermissionFlags,
    WorkspacePermissionsRead,
)
from app.schemas.workspace_member import WorkspaceMemberRoleUpdate
from app.services.workspace import WorkspaceNotFoundError
from app.services.workspace_member import WorkspaceMemberNotFoundError


class PermissionDeniedError(Exception):
    """Raised when a member lacks a required workspace permission."""


class SelfRoleChangeError(Exception):
    """Raised when an owner attempts to change their own role."""


class LastOwnerError(Exception):
    """Raised when an operation would remove the final owner role."""


class OwnerAlreadyExistsError(Exception):
    """Raised when an operation would create a second owner."""


class PermissionService:
    """Centralized workspace role and permission decisions."""

    def __init__(
        self,
        member_repository: WorkspaceMemberRepository,
        workspace_repository: WorkspaceRepository,
    ) -> None:
        self.member_repository = member_repository
        self.workspace_repository = workspace_repository

    def get_permissions(
        self,
        user: User,
        workspace_id: UUID,
    ) -> WorkspacePermissionsRead:
        _, membership = self._get_workspace_membership(user, workspace_id)
        role = membership.role
        return WorkspacePermissionsRead(
            role=role,
            permissions=WorkspacePermissionFlags(
                manage_workspace=permissions.can_manage_workspace(role),
                manage_projects=permissions.can_manage_projects(role),
                manage_tasks=permissions.can_manage_tasks(role),
                manage_members=permissions.can_manage_members(role),
                manage_invitations=permissions.can_manage_invitations(role),
                read=permissions.can_view_workspace(role),
            ),
        )

    def update_member_role(
        self,
        actor: User,
        workspace_id: UUID,
        member_id: UUID,
        data: WorkspaceMemberRoleUpdate,
    ) -> WorkspaceMember:
        workspace, actor_membership = self._get_workspace_membership(
            actor,
            workspace_id,
        )
        if workspace.owner_id != actor.id or not permissions.can_manage_members(
            actor_membership.role
        ):
            raise PermissionDeniedError

        member = self.member_repository.get_by_id(workspace, member_id)
        if member is None:
            raise WorkspaceMemberNotFoundError
        if member.user_id == actor.id:
            raise SelfRoleChangeError

        owner_count = self.member_repository.count_by_role(
            workspace,
            WorkspaceMemberRole.OWNER,
        )
        if (
            data.role == WorkspaceMemberRole.OWNER
            and member.role != WorkspaceMemberRole.OWNER
            and owner_count >= 1
        ):
            raise OwnerAlreadyExistsError
        if (
            member.role == WorkspaceMemberRole.OWNER
            and data.role != WorkspaceMemberRole.OWNER
            and owner_count <= 1
        ):
            raise LastOwnerError

        previous_role = member.role
        updated_member = self.member_repository.update_role(member, data.role)
        publish(
            DomainEvent(
                event_type=ActivityEventType.MEMBER_ROLE_UPDATED,
                resource_type=ActivityResourceType.MEMBER,
                workspace_id=workspace.id,
                resource_id=member.id,
                actor_id=actor.id,
                old_values={"role": previous_role.value},
                new_values={"role": data.role.value},
                metadata={
                    "new_role": data.role.value,
                    "previous_role": previous_role.value,
                    "user_id": str(member.user_id),
                },
            )
        )
        return updated_member

    def require_invitation_management(
        self,
        user: User,
        workspace_id: UUID,
    ) -> Workspace:
        workspace, membership = self._get_workspace_membership(user, workspace_id)
        if not permissions.can_manage_invitations(membership.role):
            raise PermissionDeniedError
        return workspace

    def require_workspace_view(
        self,
        user: User,
        workspace_id: UUID,
    ) -> Workspace:
        workspace, membership = self._get_workspace_membership(user, workspace_id)
        if not permissions.can_view_workspace(membership.role):
            raise PermissionDeniedError
        return workspace

    def require_audit_view(
        self,
        user: User,
        workspace_id: UUID,
    ) -> Workspace:
        workspace, membership = self._get_workspace_membership(user, workspace_id)
        if not permissions.can_view_audit(membership.role):
            raise PermissionDeniedError
        return workspace

    def _get_workspace_membership(
        self,
        user: User,
        workspace_id: UUID,
    ) -> tuple[Workspace, WorkspaceMember]:
        workspace = self.workspace_repository.get_active(workspace_id)
        if workspace is None:
            raise WorkspaceNotFoundError
        membership = self.member_repository.get_by_workspace_and_user(
            workspace,
            user.id,
        )
        if membership is None:
            raise WorkspaceNotFoundError
        return workspace, membership
