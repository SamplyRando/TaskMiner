from datetime import datetime, timedelta, timezone
import secrets
from uuid import UUID

from app.models.user import User
from app.models.workspace_invitation import InvitationStatus, WorkspaceInvitation
from app.models.workspace_member import WorkspaceMemberRole
from app.repositories.workspace_invitation import (
    InvitationTokenConflictError,
    WorkspaceInvitationRepository,
    WorkspaceMemberConflictError,
)
from app.repositories.workspace_member import WorkspaceMemberRepository
from app.schemas.workspace_invitation import (
    InvitationCreate,
    InvitationList,
    InvitationRead,
)
from app.services.permission import PermissionDeniedError, PermissionService
from app.services.workspace import WorkspaceNotFoundError


INVITATION_LIFETIME = timedelta(days=7)
TOKEN_GENERATION_ATTEMPTS = 5


class InvitationNotFoundError(Exception):
    """Raised when an invitation is unavailable to the current user."""


class InvitationExpiredError(Exception):
    """Raised when an expired invitation cannot transition state."""


class InvitationRevokedError(Exception):
    """Raised when a revoked invitation cannot transition state."""


class InvitationAlreadyAcceptedError(Exception):
    """Raised when an accepted invitation cannot transition state."""


class InvitationEmailMismatchError(Exception):
    """Raised when an invitation targets another email address."""


class InvitationMemberAlreadyExistsError(Exception):
    """Raised when the invited user already belongs to the workspace."""


class InvitationTokenGenerationError(Exception):
    """Raised when a unique invitation token cannot be persisted."""


class InvitationOwnerRoleError(Exception):
    """Raised when an invitation attempts to create a second owner."""


class WorkspaceInvitationService:
    """Application service for workspace invitation use cases."""

    def __init__(
        self,
        repository: WorkspaceInvitationRepository,
        member_repository: WorkspaceMemberRepository,
        permission_service: PermissionService,
    ) -> None:
        self.repository = repository
        self.member_repository = member_repository
        self.permission_service = permission_service

    def create_invitation(
        self,
        actor: User,
        workspace_id: UUID,
        data: InvitationCreate,
    ) -> WorkspaceInvitation:
        workspace = self.permission_service.require_invitation_management(
            actor,
            workspace_id,
        )
        if data.role == WorkspaceMemberRole.OWNER:
            raise InvitationOwnerRoleError

        normalized_data = InvitationCreate(
            email=str(data.email).strip().lower(),
            role=data.role,
        )
        expires_at = self._now() + INVITATION_LIFETIME
        for _ in range(TOKEN_GENERATION_ATTEMPTS):
            try:
                return self.repository.create(
                    workspace,
                    normalized_data,
                    token=secrets.token_urlsafe(32),
                    expires_at=expires_at,
                )
            except InvitationTokenConflictError:
                continue
        raise InvitationTokenGenerationError

    def list_invitations(
        self,
        actor: User,
        workspace_id: UUID,
    ) -> InvitationList:
        workspace = self.permission_service.require_invitation_management(
            actor,
            workspace_id,
        )
        self.repository.expire_pending_for_workspace(workspace, self._now())
        invitations = self.repository.list_by_workspace(workspace)
        return InvitationList(
            items=[
                InvitationRead.model_validate(invitation) for invitation in invitations
            ]
        )

    def get_invitation(
        self,
        actor: User,
        token: str,
    ) -> WorkspaceInvitation:
        invitation = self.repository.get_by_token(token)
        if invitation is None:
            raise InvitationNotFoundError
        invitation = self._expire_if_needed(invitation)

        if self._email_matches(actor, invitation):
            return invitation
        try:
            self.permission_service.require_invitation_management(
                actor,
                invitation.workspace_id,
            )
        except (PermissionDeniedError, WorkspaceNotFoundError) as exc:
            raise InvitationNotFoundError from exc
        return invitation

    def accept_invitation(
        self,
        actor: User,
        token: str,
    ) -> WorkspaceInvitation:
        invitation = self.repository.get_by_token(token, for_update=True)
        if invitation is None:
            raise InvitationNotFoundError
        invitation = self._expire_if_needed(invitation)
        self._ensure_pending(invitation)

        if not self._email_matches(actor, invitation):
            raise InvitationEmailMismatchError
        if invitation.role == WorkspaceMemberRole.OWNER:
            raise InvitationOwnerRoleError
        if (
            self.member_repository.get_by_workspace_and_user(
                invitation.workspace,
                actor.id,
            )
            is not None
        ):
            raise InvitationMemberAlreadyExistsError

        try:
            return self.repository.accept(invitation, actor, self._now())
        except WorkspaceMemberConflictError as exc:
            raise InvitationMemberAlreadyExistsError from exc

    def revoke_invitation(
        self,
        actor: User,
        token: str,
    ) -> WorkspaceInvitation:
        invitation = self.repository.get_by_token(token, for_update=True)
        if invitation is None:
            raise InvitationNotFoundError
        self.permission_service.require_invitation_management(
            actor,
            invitation.workspace_id,
        )
        invitation = self._expire_if_needed(invitation)
        self._ensure_pending(invitation)
        return self.repository.revoke(invitation, self._now())

    def _expire_if_needed(
        self,
        invitation: WorkspaceInvitation,
    ) -> WorkspaceInvitation:
        now = self._now()
        if (
            invitation.status == InvitationStatus.PENDING
            and invitation.expires_at <= now
        ):
            return self.repository.expire(invitation, now)
        return invitation

    @staticmethod
    def _ensure_pending(invitation: WorkspaceInvitation) -> None:
        if invitation.status == InvitationStatus.EXPIRED:
            raise InvitationExpiredError
        if invitation.status == InvitationStatus.REVOKED:
            raise InvitationRevokedError
        if invitation.status == InvitationStatus.ACCEPTED:
            raise InvitationAlreadyAcceptedError

    @staticmethod
    def _email_matches(user: User, invitation: WorkspaceInvitation) -> bool:
        return user.email.strip().lower() == invitation.email.strip().lower()

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)
