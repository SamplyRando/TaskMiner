from uuid import UUID

from app.models.project import Project
from app.models.user import User
from app.repositories.project import ProjectRepository
from app.schemas.pagination import PaginatedResponse
from app.schemas.project import (
    ProjectCreate,
    ProjectListParams,
    ProjectRead,
    ProjectUpdate,
)


class ProjectNotFoundError(Exception):
    """Raised when a project is not accessible to its requested owner."""


class ProjectService:
    """Application service for project-related use cases."""

    def __init__(self, repository: ProjectRepository) -> None:
        self.repository = repository

    def create_project(self, owner: User, data: ProjectCreate) -> Project:
        return self.repository.create(owner, data)

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
