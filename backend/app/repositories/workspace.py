from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember, WorkspaceMemberRole
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate


class WorkspaceRepository:
    """Persistence operations for owner-scoped workspaces."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, owner: User, data: WorkspaceCreate) -> Workspace:
        workspace = Workspace(
            name=data.name,
            description=data.description,
            owner_id=owner.id,
        )
        workspace.members.append(
            WorkspaceMember(
                user_id=owner.id,
                role=WorkspaceMemberRole.OWNER,
            )
        )
        self.session.add(workspace)

        try:
            self.session.commit()
            self.session.refresh(workspace)
        except SQLAlchemyError:
            self.session.rollback()
            raise

        return workspace

    def get_first_active_by_owner(self, owner: User) -> Workspace | None:
        statement = (
            select(Workspace)
            .where(
                Workspace.owner_id == owner.id,
                Workspace.deleted_at.is_(None),
            )
            .order_by(Workspace.created_at.asc(), Workspace.id.asc())
            .limit(1)
        )
        return self.session.scalar(statement)

    def get_by_id_for_owner(
        self,
        workspace_id: UUID,
        owner: User,
    ) -> Workspace | None:
        statement = select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.owner_id == owner.id,
            Workspace.deleted_at.is_(None),
        )
        return self.session.scalar(statement)

    def get_active(self, workspace_id: UUID) -> Workspace | None:
        statement = select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.deleted_at.is_(None),
        )
        return self.session.scalar(statement)

    def list_by_owner(self, owner: User) -> list[Workspace]:
        statement = (
            select(Workspace)
            .where(
                Workspace.owner_id == owner.id,
                Workspace.deleted_at.is_(None),
            )
            .order_by(Workspace.created_at.asc(), Workspace.id.asc())
        )
        return list(self.session.scalars(statement).all())

    def update(self, workspace: Workspace, data: WorkspaceUpdate) -> Workspace:
        updates = data.model_dump(exclude_unset=True)
        for field in ("name", "description"):
            if field in updates:
                setattr(workspace, field, updates[field])

        try:
            self.session.commit()
            self.session.refresh(workspace)
        except SQLAlchemyError:
            self.session.rollback()
            raise

        return workspace

    def delete(self, workspace: Workspace) -> None:
        workspace.deleted_at = datetime.now(timezone.utc)
        try:
            self.session.commit()
            self.session.refresh(workspace)
        except SQLAlchemyError:
            self.session.rollback()
            raise
