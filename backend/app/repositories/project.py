from collections.abc import Sequence
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectListParams, ProjectUpdate


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
            Project.deleted_at.is_(None),
        )
        return self.session.scalar(statement)

    def list_by_owner(
        self,
        owner: User,
        params: ProjectListParams,
    ) -> tuple[list[Project], int]:
        filters = [
            Project.owner_id == owner.id,
            Project.deleted_at.is_(None),
        ]
        if params.search is not None:
            pattern = f"%{params.search}%"
            filters.append(
                or_(
                    Project.name.ilike(pattern),
                    Project.description.ilike(pattern),
                )
            )

        total_statement = select(func.count(Project.id)).where(*filters)
        total = int(self.session.scalar(total_statement) or 0)

        sort_columns: dict[str, Any] = {
            "created_at": Project.created_at,
            "updated_at": Project.updated_at,
            "name": Project.name,
        }
        sort_field = params.sort.removeprefix("-")
        sort_column = sort_columns[sort_field]
        sort_expression = (
            sort_column.desc() if params.sort.startswith("-") else sort_column.asc()
        )

        statement = (
            select(Project)
            .where(*filters)
            .order_by(sort_expression, Project.id.asc())
            .offset(params.skip)
            .limit(params.limit)
        )
        projects = list(self.session.scalars(statement).all())
        return projects, total

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
        project.deleted_at = datetime.now(timezone.utc)
        try:
            self.session.commit()
            self.session.refresh(project)
        except SQLAlchemyError:
            self.session.rollback()
            raise
