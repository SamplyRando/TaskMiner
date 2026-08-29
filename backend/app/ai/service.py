from app.ai.provider import AIProvider
from app.ai.schemas import AIProjectPlanRequest, AIProjectPlanResponse
from app.ai.usage_service import AIUsageService
from app.models.user import User
from app.repositories.project import ProjectRepository
from app.services.permission import PermissionService


class AIProjectNotFoundError(Exception):
    """Raised when the requested project is unavailable in the workspace."""


class AIService:
    """Application service for provider-neutral AI planning use cases."""

    def __init__(
        self,
        provider: AIProvider,
        permission_service: PermissionService,
        project_repository: ProjectRepository,
        usage_service: AIUsageService,
    ) -> None:
        self.provider = provider
        self.permission_service = permission_service
        self.project_repository = project_repository
        self.usage_service = usage_service

    async def generate_project_plan(
        self,
        user: User,
        request: AIProjectPlanRequest,
    ) -> AIProjectPlanResponse:
        workspace = self.permission_service.require_task_management(
            user,
            request.workspace_id,
        )
        if request.project_id is not None:
            project = self.project_repository.get_active_by_workspace(
                request.project_id,
                workspace.id,
            )
            if project is None:
                raise AIProjectNotFoundError

        return await self.usage_service.run_generation(
            user=user,
            workspace_id=workspace.id,
            operation_type="project_plan",
            provider=self.provider,
            generate=lambda: self.provider.generate_project_plan(request),
        )
