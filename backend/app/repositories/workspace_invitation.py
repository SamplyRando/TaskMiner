from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_invitation import InvitationStatus, WorkspaceInvitation
from app.models.workspace_member import WorkspaceMember
from app.schemas.workspace_invitation import InvitationCreate


class InvitationTokenConflictError(Exception):
    """Raised when persistence rejects a duplicate invitation token."""


class WorkspaceMemberConflictError(Exception):
    """Raised when an invitation would create a duplicate membership."""


class WorkspaceInvitationRepository:
    """Persistence operations for workspace invitations."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def create(
        self,
        workspace: Workspace,
        data: InvitationCreate,
        *,
        token: str,
        expires_at: datetime,
    ) -> WorkspaceInvitation:
        invitation = WorkspaceInvitation(
            workspace_id=workspace.id,
            email=str(data.email),
            role=data.role,
            token=token,
            expires_at=expires_at,
        )
        self.session.add(invitation)

        try:
            self.session.commit()
            self.session.refresh(invitation)
        except IntegrityError as exc:
            self.session.rollback()
            raise InvitationTokenConflictError from exc
        except SQLAlchemyError:
            self.session.rollback()
            raise
        return invitation

    def list_by_workspace(
        self,
        workspace: Workspace,
    ) -> list[WorkspaceInvitation]:
        statement = (
            select(WorkspaceInvitation)
            .join(Workspace, WorkspaceInvitation.workspace_id == Workspace.id)
            .where(
                WorkspaceInvitation.workspace_id == workspace.id,
                Workspace.deleted_at.is_(None),
            )
            .order_by(
                WorkspaceInvitation.created_at.desc(),
                WorkspaceInvitation.id.desc(),
            )
        )
        return list(self.session.scalars(statement).all())

    def get_by_token(
        self,
        token: str,
        *,
        for_update: bool = False,
    ) -> WorkspaceInvitation | None:
        statement = (
            select(WorkspaceInvitation)
            .join(Workspace, WorkspaceInvitation.workspace_id == Workspace.id)
            .where(
                WorkspaceInvitation.token == token,
                Workspace.deleted_at.is_(None),
            )
        )
        if for_update:
            statement = statement.with_for_update(of=WorkspaceInvitation)
        return self.session.scalar(statement)

    def expire_pending_for_workspace(
        self,
        workspace: Workspace,
        now: datetime,
    ) -> None:
        statement = (
            update(WorkspaceInvitation)
            .where(
                WorkspaceInvitation.workspace_id == workspace.id,
                WorkspaceInvitation.status == InvitationStatus.PENDING,
                WorkspaceInvitation.expires_at <= now,
            )
            .values(
                status=InvitationStatus.EXPIRED,
                updated_at=now,
            )
        )
        try:
            self.session.execute(statement)
            self.session.commit()
        except SQLAlchemyError:
            self.session.rollback()
            raise

    def expire(
        self,
        invitation: WorkspaceInvitation,
        now: datetime,
    ) -> WorkspaceInvitation:
        invitation.status = InvitationStatus.EXPIRED
        try:
            self.session.commit()
            self.session.refresh(invitation)
        except SQLAlchemyError:
            self.session.rollback()
            raise
        return invitation

    def accept(
        self,
        invitation: WorkspaceInvitation,
        user: User,
        now: datetime,
    ) -> WorkspaceInvitation:
        member = WorkspaceMember(
            workspace_id=invitation.workspace_id,
            user_id=user.id,
            role=invitation.role,
        )
        invitation.status = InvitationStatus.ACCEPTED
        invitation.accepted_at = now
        self.session.add(member)

        try:
            self.session.commit()
            self.session.refresh(invitation)
        except IntegrityError as exc:
            self.session.rollback()
            raise WorkspaceMemberConflictError from exc
        except SQLAlchemyError:
            self.session.rollback()
            raise
        return invitation

    def revoke(
        self,
        invitation: WorkspaceInvitation,
        now: datetime,
    ) -> WorkspaceInvitation:
        invitation.status = InvitationStatus.REVOKED
        invitation.revoked_at = now
        try:
            self.session.commit()
            self.session.refresh(invitation)
        except SQLAlchemyError:
            self.session.rollback()
            raise
        return invitation
