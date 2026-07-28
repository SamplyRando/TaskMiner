from uuid import UUID

from app.models.project import Project
from app.models.user import User
from app.repositories.project import ProjectRepository
from app.repositories.workspace import WorkspaceRepository
from app.schemas.pagination import PaginatedResponse
from app.schemas.project import (
    ProjectCreate,
    ProjectListParams,
    ProjectRead,
    ProjectUpdate,
)
from app.schemas.workspace import WorkspaceCreate


DEFAULT_WORKSPACE_NAME = "My Workspace"


class ProjectNotFoundError(Exception):
    """Raised when a project is not accessible to its requested owner."""


class ProjectService:
    """Application service for project-related use cases."""

    def __init__(
        self,
        repository: ProjectRepository,
        workspace_repository: WorkspaceRepository,
    ) -> None:
        self.repository = repository
        self.workspace_repository = workspace_repository

    def create_project(self, owner: User, data: ProjectCreate) -> Project:
        workspace = self.workspace_repository.get_first_active_by_owner(owner)
        if workspace is None:
            workspace = self.workspace_repository.create(
                owner,
                WorkspaceCreate(name=DEFAULT_WORKSPACE_NAME),
            )
        return self.repository.create(workspace, data)

    def list_projects(
        self,
        owner: User,
        params: ProjectListParams,
    ) -> PaginatedResponse[ProjectRead]:
        projects, total = self.repository.list_by_owner(owner, params)
        return PaginatedResponse[ProjectRead](
            items=[ProjectRead.model_validate(project) for project in projects],
            total=total,
            skip=params.skip,
            limit=params.limit,
        )

    def get_project(self, owner: User, project_id: UUID) -> Project:
        project = self.repository.get_by_id_for_owner(project_id, owner)
        if project is None:
            raise ProjectNotFoundError
        return project

    def update_project(
        self,
        owner: User,
        project_id: UUID,
        data: ProjectUpdate,
    ) -> Project:
        project = self.repository.get_by_id_for_owner(project_id, owner)
        if project is None:
            raise ProjectNotFoundError
        return self.repository.update(project, data)

    def delete_project(self, owner: User, project_id: UUID) -> None:
        project = self.repository.get_by_id_for_owner(project_id, owner)
        if project is None:
            raise ProjectNotFoundError
        self.repository.delete(project)
