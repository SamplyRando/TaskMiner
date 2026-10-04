import json
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from pydantic import ValidationError

from app.api.deps import CurrentUserDep, ProjectServiceDep
from app.models.project import Project
from app.schemas.pagination import PaginatedResponse
from app.schemas.project import (
    ProjectCreate,
    ProjectListParams,
    ProjectRead,
    ProjectTaskStatusCreate,
    ProjectTaskStatusRead,
    ProjectTaskStatusReorder,
    ProjectTaskStatusUpdate,
    ProjectUpdate,
)
from app.schemas.project_template import ProjectTemplate
from app.services.permission import PermissionDeniedError
from app.services.project import (
    ProjectNotFoundError,
    ProjectStatusInUseError,
    ProjectStatusInvariantError,
    ProjectStatusLimitError,
    ProjectStatusNotFoundError,
)
from app.services.subscription import PlanLimitExceededError
from app.services.workspace import WorkspaceNotFoundError


router = APIRouter()
MAX_TEMPLATE_BYTES = 1_000_000


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
    workspace_id: Annotated[UUID | None, Query()] = None,
) -> Project:
    try:
        return service.create_project(current_user, data, workspace_id)
    except WorkspaceNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found.",
        ) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions.",
        ) from exc
    except PlanLimitExceededError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=exc.as_detail(),
        ) from exc


@router.post(
    "/import-template",
    response_model=ProjectRead,
    status_code=status.HTTP_201_CREATED,
)
async def import_project_template(
    current_user: CurrentUserDep,
    service: ProjectServiceDep,
    workspace_id: Annotated[UUID, Query()],
    file: Annotated[UploadFile, File()],
) -> Project:
    raw = await file.read(MAX_TEMPLATE_BYTES + 1)
    if len(raw) > MAX_TEMPLATE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="Template file is too large.",
        )
    try:
        template = ProjectTemplate.model_validate(json.loads(raw))
        return service.import_template(current_user, workspace_id, template)
    except (UnicodeDecodeError, json.JSONDecodeError, ValidationError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid or unsupported TaskMiner project template.",
        ) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions.",
        ) from exc
    except PlanLimitExceededError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=exc.as_detail(),
        ) from exc
    except WorkspaceNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Workspace not found.") from exc


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


@router.get("/{project_id}/template", response_model=ProjectTemplate)
def export_project_template(
    project_id: UUID,
    current_user: CurrentUserDep,
    service: ProjectServiceDep,
) -> ProjectTemplate:
    try:
        return service.export_template(current_user, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        ) from exc


@router.post(
    "/{project_id}/duplicate",
    response_model=ProjectRead,
    status_code=status.HTTP_201_CREATED,
)
def duplicate_project(
    project_id: UUID,
    current_user: CurrentUserDep,
    service: ProjectServiceDep,
) -> Project:
    try:
        return service.duplicate_project(current_user, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        ) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions.",
        ) from exc
    except PlanLimitExceededError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=exc.as_detail(),
        ) from exc


@router.post(
    "/{project_id}/statuses",
    response_model=ProjectTaskStatusRead,
    status_code=status.HTTP_201_CREATED,
)
def add_project_status(
    project_id: UUID,
    data: ProjectTaskStatusCreate,
    current_user: CurrentUserDep,
    service: ProjectServiceDep,
) -> ProjectTaskStatusRead:
    try:
        return ProjectTaskStatusRead.model_validate(
            service.add_task_status(current_user, project_id, data)
        )
    except ProjectStatusLimitError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A project can have at most 10 statuses.",
        ) from exc
    except (ProjectNotFoundError, ProjectStatusNotFoundError) as exc:
        raise HTTPException(status_code=404, detail="Project not found.") from exc
    except PermissionDeniedError as exc:
        raise HTTPException(
            status_code=403, detail="Insufficient permissions."
        ) from exc


@router.patch(
    "/{project_id}/statuses/{status_key}",
    response_model=ProjectTaskStatusRead,
)
def update_project_status(
    project_id: UUID,
    status_key: str,
    data: ProjectTaskStatusUpdate,
    current_user: CurrentUserDep,
    service: ProjectServiceDep,
) -> ProjectTaskStatusRead:
    try:
        return ProjectTaskStatusRead.model_validate(
            service.update_task_status(current_user, project_id, status_key, data)
        )
    except (ProjectNotFoundError, ProjectStatusNotFoundError) as exc:
        raise HTTPException(status_code=404, detail="Status not found.") from exc
    except PermissionDeniedError as exc:
        raise HTTPException(
            status_code=403, detail="Insufficient permissions."
        ) from exc
    except ProjectStatusInvariantError as exc:
        raise HTTPException(
            status_code=409,
            detail="The project must keep exactly one completed status.",
        ) from exc


@router.put(
    "/{project_id}/statuses/reorder",
    response_model=list[ProjectTaskStatusRead],
)
def reorder_project_statuses(
    project_id: UUID,
    data: ProjectTaskStatusReorder,
    current_user: CurrentUserDep,
    service: ProjectServiceDep,
) -> list[ProjectTaskStatusRead]:
    try:
        return [
            ProjectTaskStatusRead.model_validate(item)
            for item in service.reorder_task_statuses(current_user, project_id, data)
        ]
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project not found.") from exc
    except PermissionDeniedError as exc:
        raise HTTPException(
            status_code=403, detail="Insufficient permissions."
        ) from exc
    except ProjectStatusInvariantError as exc:
        raise HTTPException(status_code=422, detail="Invalid status order.") from exc


@router.delete(
    "/{project_id}/statuses/{status_key}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_project_status(
    project_id: UUID,
    status_key: str,
    current_user: CurrentUserDep,
    service: ProjectServiceDep,
    replacement_status: Annotated[str | None, Query()] = None,
) -> None:
    try:
        service.delete_task_status(
            current_user,
            project_id,
            status_key,
            replacement_status,
        )
    except (ProjectNotFoundError, ProjectStatusNotFoundError) as exc:
        raise HTTPException(status_code=404, detail="Status not found.") from exc
    except PermissionDeniedError as exc:
        raise HTTPException(
            status_code=403, detail="Insufficient permissions."
        ) from exc
    except ProjectStatusInUseError as exc:
        raise HTTPException(
            status_code=409,
            detail="This status is in use; choose a replacement status.",
        ) from exc
    except ProjectStatusInvariantError as exc:
        raise HTTPException(
            status_code=409,
            detail="The completed status and a minimum of two statuses are required.",
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
    except PermissionDeniedError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions.",
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
    except PermissionDeniedError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions.",
        ) from exc
