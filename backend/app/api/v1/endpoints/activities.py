from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from app.api.deps import (
    ActivityServiceDep,
    ActivityStreamBrokerDep,
    CurrentUserDep,
)
from app.schemas.activity import ActivityFeed, ActivityListParams
from app.services.permission import PermissionDeniedError
from app.services.workspace import WorkspaceNotFoundError


router = APIRouter()
stream_router = APIRouter()


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


@stream_router.get("/stream")
def stream_workspace_activities(
    workspace_id: UUID,
    current_user: CurrentUserDep,
    service: ActivityServiceDep,
    broker: ActivityStreamBrokerDep,
    last_event_id: Annotated[
        UUID | None,
        Header(alias="Last-Event-ID"),
    ] = None,
) -> StreamingResponse:
    try:
        initial_events = service.prepare_stream(
            current_user,
            workspace_id,
            last_event_id,
        )
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

    return StreamingResponse(
        broker.stream(workspace_id, initial_events),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
