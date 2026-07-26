from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUserDep, TaskServiceDep
from app.models.task import Task
from app.schemas.pagination import PaginatedResponse
from app.schemas.task import TaskCreate, TaskListParams, TaskRead, TaskUpdate
from app.services.task import TaskNotFoundError, TaskProjectNotFoundError


router = APIRouter()
project_router = APIRouter()


@router.get("", response_model=PaginatedResponse[TaskRead])
def list_tasks(
    current_user: CurrentUserDep,
    service: TaskServiceDep,
    params: Annotated[TaskListParams, Query()],
) -> PaginatedResponse[TaskRead]:
    return service.list_tasks(current_user, params)


@project_router.post(
    "/{project_id}/tasks",
    response_model=TaskRead,
    status_code=status.HTTP_201_CREATED,
)
def create_task(
    project_id: UUID,
    data: TaskCreate,
    current_user: CurrentUserDep,
    service: TaskServiceDep,
) -> Task:
    try:
        return service.create_task(current_user, project_id, data)
    except TaskProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        ) from exc


@project_router.get("/{project_id}/tasks", response_model=list[TaskRead])
def list_project_tasks(
    project_id: UUID,
    current_user: CurrentUserDep,
    service: TaskServiceDep,
) -> list[Task]:
    try:
        return service.list_project_tasks(current_user, project_id)
    except TaskProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        ) from exc


@router.get("/{task_id}", response_model=TaskRead)
def get_task(
    task_id: UUID,
    current_user: CurrentUserDep,
    service: TaskServiceDep,
) -> Task:
    try:
        return service.get_task(current_user, task_id)
    except TaskNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        ) from exc


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: UUID,
    data: TaskUpdate,
    current_user: CurrentUserDep,
    service: TaskServiceDep,
) -> Task:
    try:
        return service.update_task(current_user, task_id, data)
    except TaskNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        ) from exc


@router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_task(
    task_id: UUID,
    current_user: CurrentUserDep,
    service: TaskServiceDep,
) -> None:
    try:
        service.delete_task(current_user, task_id)
    except TaskNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        ) from exc
