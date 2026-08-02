from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember, WorkspaceMemberRole


class WorkspaceMemberRepository:
    """Persistence operations for workspace members."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def list_by_workspace(self, workspace: Workspace) -> list[WorkspaceMember]:
        statement = (
            select(WorkspaceMember)
            .join(Workspace, WorkspaceMember.workspace_id == Workspace.id)
            .where(
                WorkspaceMember.workspace_id == workspace.id,
                Workspace.deleted_at.is_(None),
            )
            .order_by(WorkspaceMember.created_at.asc(), WorkspaceMember.id.asc())
        )
        return list(self.session.scalars(statement).all())

    def get_by_id(
        self,
        workspace: Workspace,
        member_id: UUID,
    ) -> WorkspaceMember | None:
        statement = (
            select(WorkspaceMember)
            .join(Workspace, WorkspaceMember.workspace_id == Workspace.id)
            .where(
                WorkspaceMember.id == member_id,
                WorkspaceMember.workspace_id == workspace.id,
                Workspace.deleted_at.is_(None),
            )
        )
        return self.session.scalar(statement)

    def get_by_workspace_and_user(
        self,
        workspace: Workspace,
        user_id: UUID,
    ) -> WorkspaceMember | None:
        statement = (
            select(WorkspaceMember)
            .join(Workspace, WorkspaceMember.workspace_id == Workspace.id)
            .where(
                WorkspaceMember.workspace_id == workspace.id,
                WorkspaceMember.user_id == user_id,
                Workspace.deleted_at.is_(None),
            )
        )
        return self.session.scalar(statement)

    def count_by_role(
        self,
        workspace: Workspace,
        role: WorkspaceMemberRole,
    ) -> int:
        statement = select(func.count(WorkspaceMember.id)).where(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.role == role,
        )
        return int(self.session.scalar(statement) or 0)

    def update_role(
        self,
        member: WorkspaceMember,
        role: WorkspaceMemberRole,
    ) -> WorkspaceMember:
        member.role = role
        try:
            self.session.commit()
            self.session.refresh(member)
        except SQLAlchemyError:
            self.session.rollback()
            raise
        return member

    def delete(self, member: WorkspaceMember) -> None:
        try:
            self.session.delete(member)
            self.session.commit()
        except SQLAlchemyError:
            self.session.rollback()
            raise

    def get_primary_role(self, user_id: UUID) -> WorkspaceMemberRole | None:
        priority = {
            WorkspaceMemberRole.OWNER: 0,
            WorkspaceMemberRole.ADMIN: 1,
            WorkspaceMemberRole.MEMBER: 2,
            WorkspaceMemberRole.VIEWER: 3,
        }
        statement = (
            select(WorkspaceMember.role)
            .join(Workspace, WorkspaceMember.workspace_id == Workspace.id)
            .where(
                WorkspaceMember.user_id == user_id,
                Workspace.deleted_at.is_(None),
            )
        )
        roles = list(self.session.scalars(statement).all())
        return min(roles, key=priority.__getitem__) if roles else None
