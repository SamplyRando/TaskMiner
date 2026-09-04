from collections.abc import Sequence
from uuid import UUID

from sqlalchemy.exc import IntegrityError

from app.ai.schemas import (
    AIApplyProjectPlanRequest,
    AIApplyProjectPlanResponse,
)
from app.core.events import DomainEvent, publish
from app.models.ai_plan_application import AIPlanApplication
from app.models.project import Project
from app.models.user import User
from app.models.workspace import Workspace
from app.repositories.ai_plan_application import AIPlanApplicationRepository
from app.repositories.project import ProjectRepository
from app.repositories.workspace_member import WorkspaceMemberRepository
from app.schemas.task import TaskCreate
from app.services.permission import PermissionService
from app.services.project import ProjectService
from app.services.task import TaskService
from app.services.task_assignment import TaskAssignmentService


AI_APPLY_SOURCE = "taskminer_ai"


class AIApplyProjectNotFoundError(Exception):
    """Raised when the approved target project is hidden or unavailable."""


class AIApplyAssigneeNotFoundError(Exception):
    """Raised when an approved assignee is not an active workspace member."""


class AIIdempotencyConflictError(Exception):
    """Raised when an idempotency key is reused with another payload."""


class AIApplyService:
    """Atomically apply one explicitly approved AI project-plan draft."""

    def __init__(
        self,
        application_repository: AIPlanApplicationRepository,
        project_repository: ProjectRepository,
        member_repository: WorkspaceMemberRepository,
        permission_service: PermissionService,
        project_service: ProjectService,
        task_service: TaskService,
        assignment_service: TaskAssignmentService,
    ) -> None:
        self.application_repository = application_repository
        self.project_repository = project_repository
        self.member_repository = member_repository
        self.permission_service = permission_service
        self.project_service = project_service
        self.task_service = task_service
        self.assignment_service = assignment_service

    def apply_project_plan(
        self,
        user: User,
        data: AIApplyProjectPlanRequest,
    ) -> AIApplyProjectPlanResponse:
        workspace = self.permission_service.require_task_management(
            user,
            data.workspace_id,
        )
        creating_project = data.project_id is None
        if creating_project:
            workspace = self.permission_service.require_project_creation(
                user,
                data.workspace_id,
            )

        request_hash = data.request_hash()
        existing = self.application_repository.get(
            user,
            workspace.id,
            data.idempotency_key,
        )
        if existing is not None:
            return self._replay(existing, request_hash, data)

        assignees = {
            assignee_id: self.member_repository.get_active_user(
                workspace,
                assignee_id,
            )
            for assignee_id in {
                task.assigned_user_id
                for task in data.tasks
                if task.assigned_user_id is not None
            }
        }
        if any(assignee is None for assignee in assignees.values()):
            raise AIApplyAssigneeNotFoundError

        try:
            application = self.application_repository.reserve(
                user,
                workspace.id,
                data.idempotency_key,
                request_hash,
                created_project=creating_project,
            )
        except IntegrityError:
            self.application_repository.rollback()
            concurrent = self.application_repository.get(
                user,
                workspace.id,
                data.idempotency_key,
            )
            if concurrent is None:
                raise
            return self._replay(concurrent, request_hash, data)

        events: list[DomainEvent] = []
        try:
            project = self._resolve_project(
                user,
                workspace,
                data,
                events,
            )
            task_ids: list[UUID] = []
            for approved_task in sorted(data.tasks, key=lambda task: task.source_order):
                task, task_event = self.task_service.stage_task(
                    user,
                    project,
                    TaskCreate.model_validate(
                        approved_task.model_dump(
                            include={
                                "title",
                                "description",
                                "status",
                                "priority",
                                "due_date",
                            }
                        )
                    ),
                    source=AI_APPLY_SOURCE,
                )
                task_ids.append(task.id)
                events.append(task_event)
                if approved_task.assigned_user_id is not None:
                    assignee = assignees[approved_task.assigned_user_id]
                    if assignee is None:
                        raise AIApplyAssigneeNotFoundError
                    events.append(
                        self.assignment_service.stage_assignment(
                            user,
                            task,
                            assignee,
                            source=AI_APPLY_SOURCE,
                        )
                    )

            skipped_task_count = data.source_task_count - len(data.tasks)
            self.application_repository.complete(
                application,
                project.id,
                task_ids,
                skipped_task_count,
            )
            self.application_repository.commit()
        except Exception:
            self.application_repository.rollback()
            raise

        self._publish(events)
        return AIApplyProjectPlanResponse(
            project_id=project.id,
            created_project=creating_project,
            created_task_ids=task_ids,
            created_task_count=len(task_ids),
            created_assignment_count=sum(
                task.assigned_user_id is not None for task in data.tasks
            ),
            skipped_task_count=skipped_task_count,
            idempotent_replay=False,
            warnings=self._advisory_warnings(data),
        )

    def _resolve_project(
        self,
        user: User,
        workspace: Workspace,
        data: AIApplyProjectPlanRequest,
        events: list[DomainEvent],
    ) -> Project:
        if data.project_id is not None:
            project = self.project_repository.get_active_by_workspace(
                data.project_id,
                workspace.id,
            )
            if project is None:
                raise AIApplyProjectNotFoundError
            return project
        if data.project is None:
            raise ValueError("Validated new-project payload has no project")
        project, event = self.project_service.stage_project(
            user,
            workspace,
            data.project,
            source=AI_APPLY_SOURCE,
        )
        events.append(event)
        return project

    @staticmethod
    def _publish(events: Sequence[DomainEvent]) -> None:
        for event in events:
            publish(event)

    @staticmethod
    def _advisory_warnings(data: AIApplyProjectPlanRequest) -> list[str]:
        if any(task.milestone or task.depends_on for task in data.tasks):
            return [
                "Milestone and dependency suggestions are advisory and were not "
                "persisted."
            ]
        return []

    @classmethod
    def _replay(
        cls,
        application: AIPlanApplication,
        request_hash: str,
        data: AIApplyProjectPlanRequest,
    ) -> AIApplyProjectPlanResponse:
        if application.request_hash != request_hash:
            raise AIIdempotencyConflictError
        if application.project_id is None:
            raise RuntimeError("Completed AI application has no project")
        return AIApplyProjectPlanResponse(
            project_id=application.project_id,
            created_project=application.created_project,
            created_task_ids=[
                UUID(task_id) for task_id in application.created_task_ids
            ],
            created_task_count=len(application.created_task_ids),
            created_assignment_count=sum(
                task.assigned_user_id is not None for task in data.tasks
            ),
            skipped_task_count=application.skipped_task_count,
            idempotent_replay=True,
            warnings=cls._advisory_warnings(data),
        )
