from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.task import Task
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.schemas.task import TaskCreate, TaskListParams, TaskUpdate


class TaskRepository:
    """Persistence operations for owner-scoped tasks."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def create(
        self,
        project: Project,
        data: TaskCreate,
        *,
        commit: bool = True,
    ) -> Task:
        task = Task(
            title=data.title,
            description=data.description,
            status=data.status,
            priority=data.priority,
            due_date=data.due_date,
            project_id=project.id,
        )
        self.session.add(task)

        if commit:
            try:
                self.session.commit()
                self.session.refresh(task)
            except SQLAlchemyError:
                self.session.rollback()
                raise
        else:
            self.session.flush()

        return task

    def get_by_id_for_owner(
        self,
        task_id: UUID,
        owner: User,
    ) -> Task | None:
        statement = (
            select(Task)
            .join(Project, Task.project_id == Project.id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(
                Task.id == task_id,
                Workspace.owner_id == owner.id,
                Task.deleted_at.is_(None),
                Project.deleted_at.is_(None),
                Workspace.deleted_at.is_(None),
            )
        )
        return self.session.scalar(statement)

    def get_by_id_for_user(self, task_id: UUID, user: User) -> Task | None:
        """Return an active task only from a workspace visible to the user."""

        statement = (
            select(Task)
            .join(Project, Task.project_id == Project.id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .join(
                WorkspaceMember,
                WorkspaceMember.workspace_id == Workspace.id,
            )
            .where(
                Task.id == task_id,
                WorkspaceMember.user_id == user.id,
                Task.deleted_at.is_(None),
                Project.deleted_at.is_(None),
                Workspace.deleted_at.is_(None),
            )
        )
        return self.session.scalar(statement)

    def list_by_project(self, project: Project) -> list[Task]:
        statement = (
            select(Task)
            .where(
                Task.project_id == project.id,
                Task.deleted_at.is_(None),
            )
            .order_by(Task.created_at.desc())
        )
        return list(self.session.scalars(statement).all())

    def get_active_by_project_for_update(
        self,
        task_id: UUID,
        project: Project,
    ) -> Task | None:
        statement = (
            select(Task)
            .where(
                Task.id == task_id,
                Task.project_id == project.id,
                Task.deleted_at.is_(None),
            )
            .with_for_update()
        )
        return self.session.scalar(statement)

    def list_by_owner(
        self,
        owner: User,
        params: TaskListParams,
    ) -> tuple[list[Task], int]:
        filters = [
            Workspace.owner_id == owner.id,
            Workspace.deleted_at.is_(None),
            Project.deleted_at.is_(None),
            Task.deleted_at.is_(None),
        ]
        if params.search is not None:
            pattern = f"%{params.search}%"
            filters.append(
                or_(
                    Task.title.ilike(pattern),
                    Task.description.ilike(pattern),
                )
            )
        if params.status is not None:
            filters.append(Task.status == params.status)
        if params.priority is not None:
            filters.append(Task.priority == params.priority)
        if params.project_id is not None:
            filters.append(Task.project_id == params.project_id)
        if params.workspace_id is not None:
            filters.append(Project.workspace_id == params.workspace_id)

        total_statement = (
            select(func.count(Task.id))
            .join(Project, Task.project_id == Project.id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(*filters)
        )
        total = int(self.session.scalar(total_statement) or 0)

        sort_columns: dict[str, Any] = {
            "created_at": Task.created_at,
            "updated_at": Task.updated_at,
            "title": Task.title,
        }
        sort_field = params.sort.removeprefix("-")
        sort_column = sort_columns[sort_field]
        sort_expression = (
            sort_column.desc() if params.sort.startswith("-") else sort_column.asc()
        )

        statement = (
            select(Task)
            .join(Project, Task.project_id == Project.id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(*filters)
            .order_by(sort_expression, Task.id.asc())
            .offset(params.skip)
            .limit(params.limit)
        )
        tasks = list(self.session.scalars(statement).all())
        return tasks, total

    def list_for_user(
        self,
        user: User,
        params: TaskListParams,
    ) -> tuple[list[Task], int]:
        """List active tasks from all workspaces visible to the current member."""

        filters = [
            WorkspaceMember.user_id == user.id,
            Workspace.deleted_at.is_(None),
            Project.deleted_at.is_(None),
            Task.deleted_at.is_(None),
        ]
        if params.search is not None:
            pattern = f"%{params.search}%"
            filters.append(
                or_(
                    Task.title.ilike(pattern),
                    Task.description.ilike(pattern),
                )
            )
        if params.status is not None:
            filters.append(Task.status == params.status)
        if params.priority is not None:
            filters.append(Task.priority == params.priority)
        if params.project_id is not None:
            filters.append(Task.project_id == params.project_id)
        if params.workspace_id is not None:
            filters.append(Project.workspace_id == params.workspace_id)

        base = (
            select(Task)
            .join(Project, Task.project_id == Project.id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .join(
                WorkspaceMember,
                WorkspaceMember.workspace_id == Workspace.id,
            )
        )
        total_statement = select(func.count()).select_from(
            base.where(*filters).subquery()
        )
        total = int(self.session.scalar(total_statement) or 0)

        sort_columns: dict[str, Any] = {
            "created_at": Task.created_at,
            "updated_at": Task.updated_at,
            "title": Task.title,
        }
        sort_field = params.sort.removeprefix("-")
        sort_column = sort_columns[sort_field]
        sort_expression = (
            sort_column.desc() if params.sort.startswith("-") else sort_column.asc()
        )
        statement = (
            base.where(*filters)
            .order_by(sort_expression, Task.id.asc())
            .offset(params.skip)
            .limit(params.limit)
        )
        return list(self.session.scalars(statement).unique().all()), total

    def update(
        self,
        task: Task,
        data: TaskUpdate,
        *,
        commit: bool = True,
    ) -> Task:
        updates = data.model_dump(exclude_unset=True)
        for field in ("title", "description", "status", "priority", "due_date"):
            if field in updates:
                setattr(task, field, updates[field])

        if commit:
            try:
                self.session.commit()
                self.session.refresh(task)
            except SQLAlchemyError:
                self.session.rollback()
                raise
        else:
            self.session.flush()

        return task

    def assign(
        self,
        task: Task,
        assigned_user: User,
        *,
        commit: bool = True,
    ) -> Task:
        task.assigned_user_id = assigned_user.id
        if commit:
            try:
                self.session.commit()
                self.session.refresh(task)
            except SQLAlchemyError:
                self.session.rollback()
                raise
        else:
            self.session.flush()
        return task

    def unassign(self, task: Task) -> Task:
        task.assigned_user_id = None
        try:
            self.session.commit()
            self.session.refresh(task)
        except SQLAlchemyError:
            self.session.rollback()
            raise
        return task

    def delete(self, task: Task) -> None:
        task.deleted_at = datetime.now(timezone.utc)
        try:
            self.session.commit()
            self.session.refresh(task)
        except SQLAlchemyError:
            self.session.rollback()
            raise
