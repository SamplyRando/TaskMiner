from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate


class ProjectRepository:
    """Contract for future project persistence operations."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, owner: User, data: ProjectCreate) -> Project:
        project = Project(
            name=data.name,
            description=data.description,
            owner_id=owner.id,
        )
        self.session.add(project)

        try:
            self.session.commit()
            self.session.refresh(project)
        except SQLAlchemyError:
            self.session.rollback()
            raise

        return project

    def get(self, project_id: UUID) -> Project | None:
        raise NotImplementedError

    def get_by_id_for_owner(
        self,
        project_id: UUID,
        owner: User,
    ) -> Project | None:
        statement = select(Project).where(
            Project.id == project_id,
            Project.owner_id == owner.id,
        )
        return self.session.scalar(statement)

    def list_by_owner(
        self,
        owner: User,
        *,
        offset: int = 0,
        limit: int = 100,
    ) -> list[Project]:
        statement = (
            select(Project)
            .where(Project.owner_id == owner.id)
            .order_by(Project.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(self.session.scalars(statement).all())

    def list(self, *, offset: int = 0, limit: int = 100) -> Sequence[Project]:
        raise NotImplementedError

    def update(self, project: Project, data: ProjectUpdate) -> Project:
        updates = data.model_dump(exclude_unset=True)
        for field in ("name", "description"):
            if field in updates:
                setattr(project, field, updates[field])

        try:
            self.session.commit()
            self.session.refresh(project)
        except SQLAlchemyError:
            self.session.rollback()
            raise

        return project

    def delete(self, project: Project) -> None:
        try:
            self.session.delete(project)
            self.session.commit()
        except SQLAlchemyError:
            self.session.rollback()
            raise
