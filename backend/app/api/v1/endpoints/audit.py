from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import AuditServiceDep, CurrentUserDep
from app.schemas.audit import AuditFeed, AuditListParams
from app.services.permission import PermissionDeniedError
from app.services.workspace import WorkspaceNotFoundError


router = APIRouter()


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
