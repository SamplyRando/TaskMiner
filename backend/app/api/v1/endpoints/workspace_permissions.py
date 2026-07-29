from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUserDep, PermissionServiceDep
from app.schemas.permissions import WorkspacePermissionsRead
from app.services.workspace import WorkspaceNotFoundError


router = APIRouter()


@router.get(
    "/{workspace_id}/permissions",
    response_model=WorkspacePermissionsRead,
)
def get_workspace_permissions(
    workspace_id: UUID,
    current_user: CurrentUserDep,
    service: PermissionServiceDep,
) -> WorkspacePermissionsRead:
    try:
        return service.get_permissions(current_user, workspace_id)
    except WorkspaceNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found.",
        ) from exc
