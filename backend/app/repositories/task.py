from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.task import Task
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate


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
