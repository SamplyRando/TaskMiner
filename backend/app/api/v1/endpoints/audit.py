from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from app.api.deps import AuditServiceDep, AuditStreamBrokerDep, CurrentUserDep
from app.schemas.audit import AuditFeed, AuditListParams
from app.services.permission import PermissionDeniedError
from app.services.workspace import WorkspaceNotFoundError


router = APIRouter()
stream_router = APIRouter()


@router.get(
    "/{workspace_id}/audit",
    response_model=AuditFeed,
)
def list_workspace_audit_logs(
    workspace_id: UUID,
    current_user: CurrentUserDep,
    service: AuditServiceDep,
    params: Annotated[AuditListParams, Query()],
) -> AuditFeed:
    try:
        return service.list_workspace_logs(current_user, workspace_id, params)
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
async def stream_workspace_audit_logs(
    workspace_id: UUID,
    current_user: CurrentUserDep,
    service: AuditServiceDep,
    broker: AuditStreamBrokerDep,
    last_event_id: Annotated[
        UUID | None,
        Header(alias="Last-Event-ID"),
    ] = None,
) -> StreamingResponse:
    subscription = broker.subscribe_workspace(workspace_id)
    try:
        initial_events = service.prepare_stream(
            current_user,
            workspace_id,
            last_event_id,
        )
    except WorkspaceNotFoundError as exc:
        broker.unsubscribe_workspace(workspace_id, subscription)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found.",
        ) from exc
    except PermissionDeniedError as exc:
        broker.unsubscribe_workspace(workspace_id, subscription)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions.",
        ) from exc
    except Exception:
        broker.unsubscribe_workspace(workspace_id, subscription)
        raise

    return StreamingResponse(
        broker.stream(
            workspace_id,
            initial_events,
            subscription=subscription,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
