from collections.abc import Sequence
from dataclasses import dataclass
from uuid import UUID

from sqlalchemy.exc import IntegrityError

from app.ai.apply_service import AI_APPLY_SOURCE, AIIdempotencyConflictError
from app.ai.schemas import (
    AIApplyProjectChangePlanRequest,
    AIApplyProjectChangePlanResponse,
    AIProjectChangeConflict,
    AITaskChangeState,
)
from app.ai.service import AIProjectNotFoundError
from app.core.events import DomainEvent, publish
from app.models.ai_plan_application import AIPlanApplication
from app.models.task import Task
from app.models.user import User
from app.repositories.ai_plan_application import AIPlanApplicationRepository
from app.repositories.project import ProjectRepository
from app.repositories.task import TaskRepository
from app.schemas.task import TaskUpdate
from app.services.permission import PermissionService
from app.services.task import TaskService


class AIProjectChangeTaskNotFoundError(Exception):
    """Raised when an approved task is outside the selected active project."""


@dataclass(frozen=True, slots=True)
class AIProjectChangeConflictError(Exception):
    """Raised when a reviewed task snapshot is no longer current."""

    conflicts: list[AIProjectChangeConflict]


class AIProjectChangeApplyService:
    """Apply reviewed task changes atomically with stale-state protection."""

    def __init__(
        self,
        application_repository: AIPlanApplicationRepository,
        project_repository: ProjectRepository,
        task_repository: TaskRepository,
        permission_service: PermissionService,
        task_service: TaskService,
    ) -> None:
        self.application_repository = application_repository
        self.project_repository = project_repository
        self.task_repository = task_repository
        self.permission_service = permission_service
        self.task_service = task_service

    def apply_project_change_plan(
        self,
        user: User,
        data: AIApplyProjectChangePlanRequest,
    ) -> AIApplyProjectChangePlanResponse:
        workspace = self.permission_service.require_task_management(
            user,
            data.workspace_id,
        )
        project = self.project_repository.get_active_by_workspace(
            data.project_id,
            workspace.id,
        )
        if project is None:
            raise AIProjectNotFoundError

        request_hash = data.request_hash()
        existing = self.application_repository.get(
            user,
            workspace.id,
            data.idempotency_key,
        )
        if existing is not None:
            return self._replay(existing, request_hash, data)

        locked_tasks: dict[UUID, Task] = {}
        for change in sorted(data.changes, key=lambda item: str(item.task_id)):
            task = self.task_repository.get_active_by_project_for_update(
                change.task_id,
                project,
            )
            if task is None:
                self.application_repository.rollback()
                raise AIProjectChangeTaskNotFoundError
            locked_tasks[change.task_id] = task

        concurrent = self.application_repository.get(
            user,
            workspace.id,
            data.idempotency_key,
        )
        if concurrent is not None:
            self.application_repository.rollback()
            return self._replay(concurrent, request_hash, data)

        conflicts = [
            AIProjectChangeConflict(
                task_id=change.task_id,
                task_title=locked_tasks[change.task_id].title,
                expected=change.before,
                current=self._task_state(locked_tasks[change.task_id]),
            )
            for change in data.changes
            if self._task_state(locked_tasks[change.task_id]) != change.before
        ]
        if conflicts:
            self.application_repository.rollback()
            raise AIProjectChangeConflictError(conflicts)

        try:
            application = self.application_repository.reserve(
                user,
                workspace.id,
                data.idempotency_key,
                request_hash,
                created_project=False,
            )
        except IntegrityError:
            self.application_repository.rollback()
            replay = self.application_repository.get(
                user,
                workspace.id,
                data.idempotency_key,
            )
            if replay is None:
                raise
            return self._replay(replay, request_hash, data)

        events: list[DomainEvent] = []
        modified_task_ids: list[UUID] = []
        try:
            for change in data.changes:
                update_values = change.after.model_dump(
                    include={str(field) for field in change.changed_fields},
                )
                task, event = self.task_service.stage_task_update(
                    user,
                    project,
                    locked_tasks[change.task_id],
                    TaskUpdate.model_validate(update_values),
                    source=AI_APPLY_SOURCE,
                )
                modified_task_ids.append(task.id)
                events.append(event)

            skipped_change_count = data.source_change_count - len(data.changes)
            self.application_repository.complete(
                application,
                project.id,
                modified_task_ids,
                skipped_change_count,
            )
            self.application_repository.commit()
        except Exception:
            self.application_repository.rollback()
            raise

        self._publish(events)
        return AIApplyProjectChangePlanResponse(
            project_id=project.id,
            modified_task_ids=modified_task_ids,
            modified_task_count=len(modified_task_ids),
            changed_field_count=sum(
                len(change.changed_fields) for change in data.changes
            ),
            skipped_change_count=skipped_change_count,
            idempotent_replay=False,
        )

    @staticmethod
    def _task_state(task: Task) -> AITaskChangeState:
        return AITaskChangeState(
            title=task.title,
            description=task.description,
            status=task.status,
            priority=task.priority,
            due_date=task.due_date,
        )

    @staticmethod
    def _publish(events: Sequence[DomainEvent]) -> None:
        for event in events:
            publish(event)

    @staticmethod
    def _replay(
        application: AIPlanApplication,
        request_hash: str,
        data: AIApplyProjectChangePlanRequest,
    ) -> AIApplyProjectChangePlanResponse:
        if application.request_hash != request_hash:
            raise AIIdempotencyConflictError
        if application.project_id is None:
            raise RuntimeError("Completed AI change application has no project")
        return AIApplyProjectChangePlanResponse(
            project_id=application.project_id,
            modified_task_ids=[
                UUID(task_id) for task_id in application.created_task_ids
            ],
            modified_task_count=len(application.created_task_ids),
            changed_field_count=sum(
                len(change.changed_fields) for change in data.changes
            ),
            skipped_change_count=application.skipped_task_count,
            idempotent_replay=True,
        )
