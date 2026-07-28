from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember


class WorkspaceMemberRepository:
    """Read-only persistence operations for workspace members."""

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
