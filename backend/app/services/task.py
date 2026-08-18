from uuid import UUID

from app.core.events import (
    ActivityEventType,
    ActivityResourceType,
    DomainEvent,
    publish,
)
from app.models.project import Project
from app.models.task import Task
from app.models.user import User
from app.repositories.project import ProjectRepository
from app.repositories.task import TaskRepository
from app.schemas.pagination import PaginatedResponse
from app.schemas.task import TaskCreate, TaskListParams, TaskRead, TaskUpdate


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
        task = self.repository.create(project, data)
        publish(self.task_created_event(owner, project, task))
        return task

    def stage_task(
        self,
        actor: User,
        project: Project,
        data: TaskCreate,
        *,
        source: str,
    ) -> tuple[Task, DomainEvent]:
        """Stage a task and its event inside a caller-owned transaction."""

        task = self.repository.create(project, data, commit=False)
        return task, self.task_created_event(
            actor,
            project,
            task,
            source=source,
        )

    @staticmethod
    def task_created_event(
        actor: User,
        project: Project,
        task: Task,
        *,
        source: str | None = None,
    ) -> DomainEvent:
        metadata = {
            "project_id": str(project.id),
            "title": task.title,
        }
        if source is not None:
            metadata["source"] = source
        return DomainEvent(
            event_type=ActivityEventType.TASK_CREATED,
            resource_type=ActivityResourceType.TASK,
            workspace_id=project.workspace_id,
            resource_id=task.id,
            actor_id=actor.id,
            new_values={
                "description": task.description,
                "due_date": (
                    task.due_date.isoformat() if task.due_date is not None else None
                ),
                "priority": task.priority.value,
                "status": task.status.value,
                "title": task.title,
            },
            metadata=metadata,
        )

    def list_project_tasks(self, owner: User, project_id: UUID) -> list[Task]:
        project = self._get_owned_project(owner, project_id)
        return self.repository.list_by_project(project)

    def list_tasks(
        self,
        owner: User,
        params: TaskListParams,
    ) -> PaginatedResponse[TaskRead]:
        tasks, total = self.repository.list_by_owner(owner, params)
        return PaginatedResponse[TaskRead](
            items=[TaskRead.model_validate(task) for task in tasks],
            total=total,
            skip=params.skip,
            limit=params.limit,
        )

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
        changed_fields = data.model_fields_set
        old_values = TaskRead.model_validate(task).model_dump(
            mode="json",
            include=changed_fields,
        )
        updated_task = self.repository.update(task, data)
        new_values = TaskRead.model_validate(updated_task).model_dump(
            mode="json",
            include=changed_fields,
        )
        publish(
            self.task_updated_event(
                owner,
                task,
                changed_fields,
                old_values,
                new_values,
            )
        )
        return updated_task

    def stage_task_update(
        self,
        actor: User,
        project: Project,
        task: Task,
        data: TaskUpdate,
        *,
        source: str,
    ) -> tuple[Task, DomainEvent]:
        """Stage an update and event inside a caller-owned transaction."""

        changed_fields = data.model_fields_set
        old_values = TaskRead.model_validate(task).model_dump(
            mode="json",
            include=changed_fields,
        )
        updated_task = self.repository.update(task, data, commit=False)
        new_values = TaskRead.model_validate(updated_task).model_dump(
            mode="json",
            include=changed_fields,
        )
        return updated_task, self.task_updated_event(
            actor,
            task,
            changed_fields,
            old_values,
            new_values,
            source=source,
            project=project,
        )

    @staticmethod
    def task_updated_event(
        actor: User,
        task: Task,
        changed_fields: set[str],
        old_values: dict[str, object],
        new_values: dict[str, object],
        *,
        source: str | None = None,
        project: Project | None = None,
    ) -> DomainEvent:
        metadata: dict[str, object] = {"fields": sorted(changed_fields)}
        if source is not None:
            metadata["source"] = source
        workspace_id = (
            project.workspace_id if project is not None else task.project.workspace_id
        )
        return DomainEvent(
            event_type=ActivityEventType.TASK_UPDATED,
            resource_type=ActivityResourceType.TASK,
            workspace_id=workspace_id,
            resource_id=task.id,
            actor_id=actor.id,
            old_values=old_values,
            new_values=new_values,
            metadata=metadata,
        )

    def delete_task(self, owner: User, task_id: UUID) -> None:
        task = self.repository.get_by_id_for_owner(task_id, owner)
        if task is None:
            raise TaskNotFoundError
        self.repository.delete(task)
        publish(
            DomainEvent(
                event_type=ActivityEventType.TASK_DELETED,
                resource_type=ActivityResourceType.TASK,
                workspace_id=task.project.workspace_id,
                resource_id=task.id,
                actor_id=owner.id,
                old_values={
                    "description": task.description,
                    "priority": task.priority.value,
                    "status": task.status.value,
                    "title": task.title,
                },
                metadata={
                    "project_id": str(task.project_id),
                    "title": task.title,
                },
            )
        )

    def _get_owned_project(self, owner: User, project_id: UUID) -> Project:
        project = self.project_repository.get_by_id_for_owner(project_id, owner)
        if project is None:
            raise TaskProjectNotFoundError
        return project
