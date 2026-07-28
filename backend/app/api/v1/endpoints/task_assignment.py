from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUserDep, TaskAssignmentServiceDep
from app.models.task import Task
from app.schemas.task import TaskRead
from app.schemas.task_assignment import TaskAssignmentUpdate
from app.services.task import TaskNotFoundError
from app.services.task_assignment import TaskAssigneeNotFoundError


router = APIRouter()


@router.patch("/{task_id}/assign", response_model=TaskRead)
def assign_task(
    task_id: UUID,
    data: TaskAssignmentUpdate,
    current_user: CurrentUserDep,
    service: TaskAssignmentServiceDep,
) -> Task:
    try:
        return service.assign_task(current_user, task_id, data)
    except TaskNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        ) from exc
    except TaskAssigneeNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        ) from exc


@router.delete("/{task_id}/assign", status_code=status.HTTP_204_NO_CONTENT)
def unassign_task(
    task_id: UUID,
    current_user: CurrentUserDep,
    service: TaskAssignmentServiceDep,
) -> None:
    try:
        service.unassign_task(current_user, task_id)
    except TaskNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        ) from exc
