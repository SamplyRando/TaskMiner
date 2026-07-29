from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import ActivityServiceDep, CurrentUserDep
from app.schemas.activity import ActivityFeed, ActivityListParams
from app.services.permission import PermissionDeniedError
from app.services.workspace import WorkspaceNotFoundError


router = APIRouter()


@router.get(
    "/{workspace_id}/activities",
    response_model=ActivityFeed,
)
def list_workspace_activities(
    workspace_id: UUID,
    current_user: CurrentUserDep,
    service: ActivityServiceDep,
    params: Annotated[ActivityListParams, Query()],
) -> ActivityFeed:
    try:
        return service.list_workspace_feed(current_user, workspace_id, params)
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
