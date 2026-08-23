from uuid import UUID

from app.core.events import (
    ActivityEventType,
    ActivityResourceType,
    DomainEvent,
    publish,
)
from app.models.task import Task
from app.models.user import User
from app.repositories.task import TaskRepository
from app.repositories.workspace_member import WorkspaceMemberRepository
from app.schemas.task_assignment import TaskAssignmentUpdate
from app.services.permission import PermissionService
from app.services.task import TaskNotFoundError


class TaskAssigneeNotFoundError(Exception):
    """Raised when the requested assignee does not exist or is inactive."""


class TaskAssignmentService:
    """Application service for assigning and unassigning tasks."""

    def __init__(
        self,
        task_repository: TaskRepository,
        member_repository: WorkspaceMemberRepository,
        permission_service: PermissionService,
    ) -> None:
        self.task_repository = task_repository
        self.member_repository = member_repository
        self.permission_service = permission_service

    def assign_task(
        self,
        owner: User,
        task_id: UUID,
        data: TaskAssignmentUpdate,
    ) -> Task:
        task = self._get_manageable_task(owner, task_id)
        assigned_user = self.member_repository.get_active_user(
            task.project.workspace,
            data.assigned_user_id,
        )
        if assigned_user is None:
            raise TaskAssigneeNotFoundError
        previous_assignee_id = task.assigned_user_id
        assigned_task = self.task_repository.assign(task, assigned_user)
        publish(
            self.task_assigned_event(
                owner,
                task,
                assigned_user,
                previous_assignee_id=previous_assignee_id,
            )
        )
        return assigned_task

    def stage_assignment(
        self,
        actor: User,
        task: Task,
        assigned_user: User,
        *,
        source: str,
    ) -> DomainEvent:
        """Stage an assignment and its event in a caller-owned transaction."""

        previous_assignee_id = task.assigned_user_id
        self.task_repository.assign(task, assigned_user, commit=False)
        return self.task_assigned_event(
            actor,
            task,
            assigned_user,
            previous_assignee_id=previous_assignee_id,
            source=source,
        )

    @staticmethod
    def task_assigned_event(
        actor: User,
        task: Task,
        assigned_user: User,
        *,
        previous_assignee_id: UUID | None,
        source: str | None = None,
    ) -> DomainEvent:
        metadata = {"assigned_user_id": str(assigned_user.id)}
        if source is not None:
            metadata["source"] = source
        return DomainEvent(
            event_type=ActivityEventType.TASK_ASSIGNED,
            resource_type=ActivityResourceType.TASK,
            workspace_id=task.project.workspace_id,
            resource_id=task.id,
            actor_id=actor.id,
            old_values={
                "assigned_user_id": (
                    str(previous_assignee_id)
                    if previous_assignee_id is not None
                    else None
                )
            },
            new_values={"assigned_user_id": str(assigned_user.id)},
            metadata=metadata,
        )

    def unassign_task(self, owner: User, task_id: UUID) -> None:
        task = self._get_manageable_task(owner, task_id)
        self.task_repository.unassign(task)

    def _get_manageable_task(self, owner: User, task_id: UUID) -> Task:
        task = self.task_repository.get_by_id_for_user(task_id, owner)
        if task is None:
            raise TaskNotFoundError
        self.permission_service.require_task_management(
            owner,
            task.project.workspace_id,
        )
        return task
