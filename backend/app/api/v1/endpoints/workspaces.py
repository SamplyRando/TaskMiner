from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.deps import (
    CurrentUserDep,
    SubscriptionServiceDep,
    WorkspaceServiceDep,
)
from app.models.workspace import Workspace
from app.schemas.workspace import WorkspaceCreate, WorkspaceRead, WorkspaceUpdate
from app.schemas.subscription import WorkspaceSubscriptionRead
from app.services.subscription import PlanLimitExceededError
from app.services.workspace import WorkspaceNotFoundError


router = APIRouter()


@router.post("", response_model=WorkspaceRead, status_code=status.HTTP_201_CREATED)
def create_workspace(
    data: WorkspaceCreate,
    current_user: CurrentUserDep,
    service: WorkspaceServiceDep,
) -> Workspace:
    try:
        return service.create_workspace(current_user, data)
    except PlanLimitExceededError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=exc.as_detail(),
        ) from exc


@router.get(
    "/{workspace_id}/subscription",
    response_model=WorkspaceSubscriptionRead,
)
def get_workspace_subscription(
    workspace_id: UUID,
    current_user: CurrentUserDep,
    service: SubscriptionServiceDep,
) -> WorkspaceSubscriptionRead:
    try:
        return service.get_summary(current_user, workspace_id)
    except WorkspaceNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found.",
        ) from exc


@router.get("", response_model=list[WorkspaceRead])
def list_workspaces(
    current_user: CurrentUserDep,
    service: WorkspaceServiceDep,
) -> list[Workspace]:
    return service.list_workspaces(current_user)


@router.get("/{workspace_id}", response_model=WorkspaceRead)
def get_workspace(
    workspace_id: UUID,
    current_user: CurrentUserDep,
    service: WorkspaceServiceDep,
) -> Workspace:
    try:
        return service.get_workspace(current_user, workspace_id)
    except WorkspaceNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found.",
        ) from exc


@router.patch("/{workspace_id}", response_model=WorkspaceRead)
def update_workspace(
    workspace_id: UUID,
    data: WorkspaceUpdate,
    current_user: CurrentUserDep,
    service: WorkspaceServiceDep,
) -> Workspace:
    try:
        return service.update_workspace(current_user, workspace_id, data)
    except WorkspaceNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found.",
        ) from exc


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(
    workspace_id: UUID,
    current_user: CurrentUserDep,
    service: WorkspaceServiceDep,
) -> None:
    try:
        service.delete_workspace(current_user, workspace_id)
    except WorkspaceNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found.",
        ) from exc
