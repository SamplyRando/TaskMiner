from datetime import datetime, timedelta, timezone
import logging
import math
import secrets
from uuid import UUID, uuid4

from app.core.events import (
    ActivityEventType,
    ActivityResourceType,
    DomainEvent,
    publish,
)
from app.email.provider import EmailProviderError
from app.email.service import EmailService
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
    InvitationListParams,
    InvitationRead,
)
from app.services.permission import PermissionDeniedError, PermissionService
from app.services.workspace import WorkspaceNotFoundError


INVITATION_LIFETIME = timedelta(days=7)
INVITATION_RESEND_COOLDOWN = timedelta(seconds=60)
TOKEN_GENERATION_ATTEMPTS = 5
logger = logging.getLogger(__name__)


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


class InvitationEmailDeliveryError(Exception):
    """Raised after an invitation persists but its email delivery fails."""


class InvitationResendCooldownError(Exception):
    """Raised when another delivery attempt is requested too quickly."""

    def __init__(self, retry_after_seconds: int) -> None:
        self.retry_after_seconds = retry_after_seconds
        super().__init__("Invitation email resend cooldown is active.")


class WorkspaceInvitationService:
    """Application service for workspace invitation use cases."""

    def __init__(
        self,
        repository: WorkspaceInvitationRepository,
        member_repository: WorkspaceMemberRepository,
        permission_service: PermissionService,
        email_service: EmailService,
    ) -> None:
        self.repository = repository
        self.member_repository = member_repository
        self.permission_service = permission_service
        self.email_service = email_service

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
                invitation = self.repository.create(
                    workspace,
                    actor,
                    normalized_data,
                    token=secrets.token_urlsafe(32),
                    expires_at=expires_at,
                )
            except InvitationTokenConflictError:
                continue
            publish(
                DomainEvent(
                    event_type=ActivityEventType.INVITATION_CREATED,
                    resource_type=ActivityResourceType.INVITATION,
                    workspace_id=workspace.id,
                    resource_id=invitation.id,
                    actor_id=actor.id,
                    new_values={
                        "email": invitation.email,
                        "role": invitation.role.value,
                        "status": invitation.status.value,
                    },
                    metadata={
                        "email": invitation.email,
                        "role": invitation.role.value,
                    },
                )
            )
            return self._deliver_invitation_email(invitation, actor)
        raise InvitationTokenGenerationError

    def resend_invitation(
        self,
        actor: User,
        workspace_id: UUID,
        invitation_id: UUID,
    ) -> WorkspaceInvitation:
        workspace = self.permission_service.require_invitation_management(
            actor,
            workspace_id,
        )
        invitation = self.repository.get_by_id_for_workspace(
            invitation_id,
            workspace,
            for_update=True,
        )
        if invitation is None:
            raise InvitationNotFoundError
        invitation = self._expire_if_needed(invitation)
        self._ensure_pending(invitation)
        self._ensure_resend_cooldown_elapsed(invitation)
        return self._deliver_invitation_email(invitation, actor)

    def list_invitations(
        self,
        actor: User,
        workspace_id: UUID,
        params: InvitationListParams,
    ) -> InvitationList:
        workspace = self.permission_service.require_invitation_management(
            actor,
            workspace_id,
        )
        self.repository.expire_pending_for_workspace(workspace, self._now())
        invitations, total = self.repository.list_by_workspace(workspace, params)
        return InvitationList(
            items=[
                InvitationRead.model_validate(invitation) for invitation in invitations
            ],
            total=total,
            skip=params.skip,
            limit=params.limit,
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
            accepted_invitation = self.repository.accept(
                invitation,
                actor,
                self._now(),
            )
        except WorkspaceMemberConflictError as exc:
            raise InvitationMemberAlreadyExistsError from exc
        publish(
            DomainEvent(
                event_type=ActivityEventType.INVITATION_ACCEPTED,
                resource_type=ActivityResourceType.INVITATION,
                workspace_id=invitation.workspace_id,
                resource_id=invitation.id,
                actor_id=actor.id,
                old_values={"status": InvitationStatus.PENDING.value},
                new_values={"status": InvitationStatus.ACCEPTED.value},
                metadata={
                    "email": invitation.email,
                    "role": invitation.role.value,
                },
            )
        )
        return accepted_invitation

    def revoke_invitation(
        self,
        actor: User,
        token: str,
    ) -> WorkspaceInvitation:
        invitation = self.repository.get_by_token(token, for_update=True)
        if invitation is None:
            raise InvitationNotFoundError
        if not self._email_matches(actor, invitation):
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

    def _deliver_invitation_email(
        self,
        invitation: WorkspaceInvitation,
        actor: User,
    ) -> WorkspaceInvitation:
        attempted_at = self._now()
        invitation = self.repository.reserve_email_delivery(
            invitation,
            attempted_at,
        )
        inviter = invitation.invited_by or actor
        try:
            result = self.email_service.send_workspace_invitation(
                recipient=invitation.email,
                token=invitation.token,
                workspace_name=invitation.workspace.name,
                inviter_name=inviter.full_name,
                inviter_email=inviter.email,
                role=invitation.role,
                expires_at=invitation.expires_at,
                idempotency_key=(f"workspace-invitation/{invitation.id}/{uuid4()}"),
            )
        except EmailProviderError as exc:
            self.repository.mark_email_failed(invitation)
            logger.warning(
                "Workspace invitation email delivery failed for invitation_id=%s",
                invitation.id,
            )
            raise InvitationEmailDeliveryError from exc

        if result.delivered:
            return self.repository.mark_email_sent(invitation, self._now())
        return self.repository.mark_email_skipped(invitation)

    def _ensure_resend_cooldown_elapsed(
        self,
        invitation: WorkspaceInvitation,
    ) -> None:
        attempted_at = invitation.email_last_attempted_at
        if attempted_at is None:
            return
        remaining = INVITATION_RESEND_COOLDOWN - (self._now() - attempted_at)
        if remaining.total_seconds() > 0:
            raise InvitationResendCooldownError(
                max(1, math.ceil(remaining.total_seconds()))
            )

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
