from uuid import UUID

from app.models.task import Task
from app.models.user import User
from app.repositories.task import TaskRepository
from app.repositories.user import UserRepository
from app.schemas.task_assignment import TaskAssignmentUpdate
from app.services.task import TaskNotFoundError


class TaskAssigneeNotFoundError(Exception):
    """Raised when the requested assignee does not exist or is inactive."""


class TaskAssignmentService:
    """Application service for assigning and unassigning tasks."""

    def __init__(
        self,
        task_repository: TaskRepository,
        user_repository: UserRepository,
    ) -> None:
        self.task_repository = task_repository
        self.user_repository = user_repository

    def assign_task(
        self,
        owner: User,
        task_id: UUID,
        data: TaskAssignmentUpdate,
    ) -> Task:
        task = self._get_owned_task(owner, task_id)
        assigned_user = self.user_repository.get(data.assigned_user_id)
        if assigned_user is None or not assigned_user.is_active:
            raise TaskAssigneeNotFoundError
        return self.task_repository.assign(task, assigned_user)

    def unassign_task(self, owner: User, task_id: UUID) -> None:
        task = self._get_owned_task(owner, task_id)
        self.task_repository.unassign(task)

    def _get_owned_task(self, owner: User, task_id: UUID) -> Task:
        task = self.task_repository.get_by_id_for_owner(task_id, owner)
        if task is None:
            raise TaskNotFoundError
        return task
