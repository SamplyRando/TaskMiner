from typing import Any
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.task import Task
from app.models.user import User
from app.schemas.task import TaskCreate, TaskListParams, TaskUpdate


class TaskRepository:
    """Persistence operations for owner-scoped tasks."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, project: Project, data: TaskCreate) -> Task:
        task = Task(
            title=data.title,
            description=data.description,
            status=data.status,
            priority=data.priority,
            due_date=data.due_date,
            project_id=project.id,
        )
        self.session.add(task)

        try:
            self.session.commit()
            self.session.refresh(task)
        except SQLAlchemyError:
            self.session.rollback()
            raise

        return task

    def get_by_id_for_owner(
        self,
        task_id: UUID,
        owner: User,
    ) -> Task | None:
        statement = (
            select(Task)
            .join(Project, Task.project_id == Project.id)
            .where(
                Task.id == task_id,
                Project.owner_id == owner.id,
            )
        )
        return self.session.scalar(statement)

    def list_by_project(self, project: Project) -> list[Task]:
        statement = (
            select(Task)
            .where(Task.project_id == project.id)
            .order_by(Task.created_at.desc())
        )
        return list(self.session.scalars(statement).all())

    def list_by_owner(
        self,
        owner: User,
        params: TaskListParams,
    ) -> tuple[list[Task], int]:
        filters = [Project.owner_id == owner.id]
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

        total_statement = (
            select(func.count(Task.id))
            .join(Project, Task.project_id == Project.id)
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
            .where(*filters)
            .order_by(sort_expression, Task.id.asc())
            .offset(params.skip)
            .limit(params.limit)
        )
        tasks = list(self.session.scalars(statement).all())
        return tasks, total

    def update(self, task: Task, data: TaskUpdate) -> Task:
        updates = data.model_dump(exclude_unset=True)
        for field in ("title", "description", "status", "priority", "due_date"):
            if field in updates:
                setattr(task, field, updates[field])

        try:
            self.session.commit()
            self.session.refresh(task)
        except SQLAlchemyError:
            self.session.rollback()
            raise

        return task

    def delete(self, task: Task) -> None:
        try:
            self.session.delete(task)
            self.session.commit()
        except SQLAlchemyError:
            self.session.rollback()
            raise
