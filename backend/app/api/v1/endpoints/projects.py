from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUserDep, ProjectServiceDep
from app.models.project import Project
from app.schemas.pagination import PaginatedResponse
from app.schemas.project import (
    ProjectCreate,
    ProjectListParams,
    ProjectRead,
    ProjectUpdate,
)
from app.services.project import ProjectNotFoundError


router = APIRouter()


@router.get("", response_model=PaginatedResponse[ProjectRead])
def list_projects(
    current_user: CurrentUserDep,
    service: ProjectServiceDep,
    params: Annotated[ProjectListParams, Query()],
) -> PaginatedResponse[ProjectRead]:
    return service.list_projects(current_user, params)


@router.post(
    "",
    response_model=ProjectRead,
    status_code=status.HTTP_201_CREATED,
)
def create_project(
    data: ProjectCreate,
    current_user: CurrentUserDep,
    service: ProjectServiceDep,
) -> Project:
    return service.create_project(current_user, data)


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(
    project_id: UUID,
    current_user: CurrentUserDep,
    service: ProjectServiceDep,
) -> Project:
    try:
        return service.get_project(current_user, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        ) from exc


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: UUID,
    data: ProjectUpdate,
    current_user: CurrentUserDep,
    service: ProjectServiceDep,
) -> Project:
    try:
        return service.update_project(current_user, project_id, data)
    except ProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        ) from exc


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_project(
    project_id: UUID,
    current_user: CurrentUserDep,
    service: ProjectServiceDep,
) -> None:
    try:
        service.delete_project(current_user, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        ) from exc
