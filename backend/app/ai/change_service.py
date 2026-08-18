from app.ai.provider import AIProvider
from app.ai.schemas import (
    AIProjectChangePlanRequest,
    AIProjectChangePlanResponse,
    AIProjectContext,
    AIProjectTaskContext,
    AITaskChangeState,
)
from app.ai.service import AIProjectNotFoundError
from app.models.user import User
from app.repositories.project import ProjectRepository
from app.repositories.task import TaskRepository
from app.services.permission import PermissionService


class AIProjectChangePlanService:
    """Build a safe project snapshot and request a read-only change proposal."""

    def __init__(
        self,
        provider: AIProvider,
        permission_service: PermissionService,
        project_repository: ProjectRepository,
        task_repository: TaskRepository,
    ) -> None:
        self.provider = provider
        self.permission_service = permission_service
        self.project_repository = project_repository
        self.task_repository = task_repository

    async def generate_project_change_plan(
        self,
        user: User,
        request: AIProjectChangePlanRequest,
    ) -> AIProjectChangePlanResponse:
        workspace = self.permission_service.require_workspace_view(
            user,
            request.workspace_id,
        )
        project = self.project_repository.get_active_by_workspace(
            request.project_id,
            workspace.id,
        )
        if project is None:
            raise AIProjectNotFoundError

        tasks = self.task_repository.list_by_project(project)
        context = AIProjectContext(
            id=project.id,
            name=project.name,
            description=project.description,
            tasks=[
                AIProjectTaskContext(
                    id=task.id,
                    state=AITaskChangeState(
                        title=task.title,
                        description=task.description,
                        status=task.status,
                        priority=task.priority,
                        due_date=task.due_date,
                    ),
                    assigned_user_id=task.assigned_user_id,
                    assigned_user_name=(
                        task.assigned_user.full_name
                        if task.assigned_user is not None
                        else None
                    ),
                )
                for task in tasks
            ],
        )
        return await self.provider.generate_project_change_plan(request, context)
