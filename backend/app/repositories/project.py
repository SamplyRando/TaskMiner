from __future__ import annotations

import builtins
from collections.abc import Sequence
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.project_task_status import ProjectTaskStatus
from app.models.task import Task
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.schemas.project import ProjectCreate, ProjectListParams, ProjectUpdate


class ProjectRepository:
    """Contract for future project persistence operations."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def create(
        self,
        workspace: Workspace,
        data: ProjectCreate,
        *,
        commit: bool = True,
        statuses: list[tuple[str, str, int, bool]] | None = None,
    ) -> Project:
        project = Project(
            name=data.name,
            description=data.description,
            due_date=data.due_date,
            workspace_id=workspace.id,
        )
        self.session.add(project)
        for key, label, position, is_completed in statuses or [
            ("todo", "À faire", 0, False),
            ("in_progress", "En cours", 1, False),
            ("done", "Terminée", 2, True),
        ]:
            project.task_statuses.append(
                ProjectTaskStatus(
                    key=key,
                    label=label,
                    position=position,
                    is_completed=is_completed,
                )
            )

        if commit:
            try:
                self.session.commit()
                self.session.refresh(project)
            except SQLAlchemyError:
                self.session.rollback()
                raise
        else:
            self.session.flush()

        return project

    def get(self, project_id: UUID) -> Project | None:
        raise NotImplementedError

    def get_by_id_for_owner(
        self,
        project_id: UUID,
        owner: User,
    ) -> Project | None:
        statement = (
            select(Project)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(
                Project.id == project_id,
                Workspace.owner_id == owner.id,
                Project.deleted_at.is_(None),
                Workspace.deleted_at.is_(None),
            )
        )
        return self.session.scalar(statement)

    def get_active_by_workspace(
        self,
        project_id: UUID,
        workspace_id: UUID,
    ) -> Project | None:
        """Return an active project only inside the requested active workspace."""

        statement = (
            select(Project)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(
                Project.id == project_id,
                Project.workspace_id == workspace_id,
                Project.deleted_at.is_(None),
                Workspace.deleted_at.is_(None),
            )
        )
        return self.session.scalar(statement)

    def get_by_id_for_user(
        self,
        project_id: UUID,
        user: User,
    ) -> Project | None:
        """Return an active project only when the user belongs to its workspace."""

        statement = (
            select(Project)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .join(
                WorkspaceMember,
                WorkspaceMember.workspace_id == Workspace.id,
            )
            .where(
                Project.id == project_id,
                WorkspaceMember.user_id == user.id,
                Project.deleted_at.is_(None),
                Workspace.deleted_at.is_(None),
            )
        )
        return self.session.scalar(statement)

    def list_by_owner(
        self,
        owner: User,
        params: ProjectListParams,
    ) -> tuple[list[Project], int]:
        filters = [
            Workspace.owner_id == owner.id,
            Project.deleted_at.is_(None),
            Workspace.deleted_at.is_(None),
        ]
        if params.workspace_id is not None:
            filters.append(Project.workspace_id == params.workspace_id)
        if params.search is not None:
            pattern = f"%{params.search}%"
            filters.append(
                or_(
                    Project.name.ilike(pattern),
                    Project.description.ilike(pattern),
                )
            )

        total_statement = (
            select(func.count(Project.id))
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(*filters)
        )
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
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(*filters)
            .order_by(sort_expression, Project.id.asc())
            .offset(params.skip)
            .limit(params.limit)
        )
        projects = list(self.session.scalars(statement).all())
        return projects, total

    def list_for_user(
        self,
        user: User,
        params: ProjectListParams,
    ) -> tuple[list[Project], int]:
        """List active projects from workspaces visible to the current member."""

        filters = [
            WorkspaceMember.user_id == user.id,
            Project.deleted_at.is_(None),
            Workspace.deleted_at.is_(None),
        ]
        if params.workspace_id is not None:
            filters.append(Project.workspace_id == params.workspace_id)
        if params.search is not None:
            pattern = f"%{params.search}%"
            filters.append(
                or_(
                    Project.name.ilike(pattern),
                    Project.description.ilike(pattern),
                )
            )

        joins = (
            select(Project)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .join(
                WorkspaceMember,
                WorkspaceMember.workspace_id == Workspace.id,
            )
        )
        total_statement = select(func.count()).select_from(
            joins.where(*filters).subquery()
        )
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
            joins.where(*filters)
            .order_by(sort_expression, Project.id.asc())
            .offset(params.skip)
            .limit(params.limit)
        )
        return list(self.session.scalars(statement).unique().all()), total

    def list(self, *, offset: int = 0, limit: int = 100) -> Sequence[Project]:
        raise NotImplementedError

    def update(self, project: Project, data: ProjectUpdate) -> Project:
        updates = data.model_dump(exclude_unset=True)
        for field in ("name", "description", "due_date"):
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

    def add_status(
        self,
        project: Project,
        *,
        key: str,
        label: str,
        is_completed: bool,
    ) -> ProjectTaskStatus:
        if is_completed:
            self.session.execute(
                update(ProjectTaskStatus)
                .where(ProjectTaskStatus.project_id == project.id)
                .values(is_completed=False)
            )
        status = ProjectTaskStatus(
            project_id=project.id,
            key=key,
            label=label,
            position=len(project.task_statuses),
            is_completed=is_completed,
        )
        self.session.add(status)
        self._commit()
        self.session.refresh(project)
        return status

    def update_status(
        self,
        project: Project,
        status: ProjectTaskStatus,
        *,
        label: str | None,
        is_completed: bool | None,
    ) -> ProjectTaskStatus:
        if label is not None:
            status.label = label
        if is_completed:
            self.session.execute(
                update(ProjectTaskStatus)
                .where(
                    ProjectTaskStatus.project_id == project.id,
                    ProjectTaskStatus.id != status.id,
                )
                .values(is_completed=False)
            )
            status.is_completed = True
        self._commit()
        self.session.refresh(status)
        return status

    def reorder_statuses(
        self,
        project: Project,
        ordered_keys: builtins.list[str],
    ) -> builtins.list[ProjectTaskStatus]:
        # Offset first to avoid transient violations of the unique position index.
        self.session.execute(
            update(ProjectTaskStatus)
            .where(ProjectTaskStatus.project_id == project.id)
            .values(position=ProjectTaskStatus.position + 100)
        )
        for position, key in enumerate(ordered_keys):
            self.session.execute(
                update(ProjectTaskStatus)
                .where(
                    ProjectTaskStatus.project_id == project.id,
                    ProjectTaskStatus.key == key,
                )
                .values(position=position)
            )
        self._commit()
        self.session.refresh(project)
        return list(project.task_statuses)

    def count_tasks_with_status(self, project_id: UUID, key: str) -> int:
        return int(
            self.session.scalar(
                select(func.count(Task.id)).where(
                    Task.project_id == project_id,
                    Task.status == key,
                )
            )
            or 0
        )

    def delete_status(
        self,
        project: Project,
        status: ProjectTaskStatus,
        *,
        replacement_status: ProjectTaskStatus | None,
    ) -> None:
        if replacement_status is not None:
            self.session.execute(
                update(Task)
                .where(
                    Task.project_id == project.id,
                    Task.status == status.key,
                )
                .values(status=replacement_status.key)
            )
        self.session.execute(
            delete(ProjectTaskStatus).where(ProjectTaskStatus.id == status.id)
        )
        remaining = [item for item in project.task_statuses if item.id != status.id]
        self.session.flush()
        self.session.execute(
            update(ProjectTaskStatus)
            .where(ProjectTaskStatus.project_id == project.id)
            .values(position=ProjectTaskStatus.position + 100)
        )
        for position, item in enumerate(
            sorted(remaining, key=lambda item: item.position)
        ):
            self.session.execute(
                update(ProjectTaskStatus)
                .where(ProjectTaskStatus.id == item.id)
                .values(position=position)
            )
        self._commit()

    def commit(self) -> None:
        self._commit()

    def rollback(self) -> None:
        self.session.rollback()

    def _commit(self) -> None:
        try:
            self.session.commit()
        except SQLAlchemyError:
            self.session.rollback()
            raise
