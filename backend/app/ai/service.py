from app.ai.provider import AIProvider
from app.ai.schemas import AIProjectPlanRequest, AIProjectPlanResponse
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
    ) -> None:
        self.provider = provider
        self.permission_service = permission_service
        self.project_repository = project_repository

    async def generate_project_plan(
        self,
        user: User,
        request: AIProjectPlanRequest,
    ) -> AIProjectPlanResponse:
        workspace = self.permission_service.require_workspace_view(
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

        return await self.provider.generate_project_plan(request)
