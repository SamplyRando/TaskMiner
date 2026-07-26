from uuid import UUID

from app.models.project import Project
from app.models.task import Task
from app.models.user import User
from app.repositories.project import ProjectRepository
from app.repositories.task import TaskRepository
from app.schemas.task import TaskCreate, TaskUpdate


class TaskProjectNotFoundError(Exception):
    """Raised when a task's parent project is inaccessible."""


class TaskNotFoundError(Exception):
    """Raised when a task is inaccessible to the requested owner."""


class TaskService:
    """Application service for task-related use cases."""

    def __init__(
        self,
        repository: TaskRepository,
        project_repository: ProjectRepository,
    ) -> None:
        self.repository = repository
        self.project_repository = project_repository

    def create_task(
        self,
        owner: User,
        project_id: UUID,
        data: TaskCreate,
    ) -> Task:
        project = self._get_owned_project(owner, project_id)
        return self.repository.create(project, data)

    def list_tasks(self, owner: User, project_id: UUID) -> list[Task]:
        project = self._get_owned_project(owner, project_id)
        return self.repository.list_by_project(project)

    def get_task(self, owner: User, task_id: UUID) -> Task:
        task = self.repository.get_by_id_for_owner(task_id, owner)
        if task is None:
            raise TaskNotFoundError
        return task

    def update_task(
        self,
        owner: User,
        task_id: UUID,
        data: TaskUpdate,
    ) -> Task:
        task = self.repository.get_by_id_for_owner(task_id, owner)
        if task is None:
            raise TaskNotFoundError
        return self.repository.update(task, data)

    def delete_task(self, owner: User, task_id: UUID) -> None:
        task = self.repository.get_by_id_for_owner(task_id, owner)
        if task is None:
            raise TaskNotFoundError
        self.repository.delete(task)

    def _get_owned_project(self, owner: User, project_id: UUID) -> Project:
        project = self.project_repository.get_by_id_for_owner(project_id, owner)
        if project is None:
            raise TaskProjectNotFoundError
        return project
