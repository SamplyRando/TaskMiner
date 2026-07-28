from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUserDep, WorkspaceMemberServiceDep
from app.models.workspace_member import WorkspaceMember
from app.schemas.workspace_member import WorkspaceMemberList, WorkspaceMemberRead
from app.services.workspace import WorkspaceNotFoundError
from app.services.workspace_member import WorkspaceMemberNotFoundError


router = APIRouter()


@router.get(
    "/{workspace_id}/members",
    response_model=WorkspaceMemberList,
)
def list_workspace_members(
    workspace_id: UUID,
    current_user: CurrentUserDep,
    service: WorkspaceMemberServiceDep,
) -> WorkspaceMemberList:
    try:
        return service.list_members(current_user, workspace_id)
    except WorkspaceNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found.",
        ) from exc


@router.get(
    "/{workspace_id}/members/{member_id}",
    response_model=WorkspaceMemberRead,
)
def get_workspace_member(
    workspace_id: UUID,
    member_id: UUID,
    current_user: CurrentUserDep,
    service: WorkspaceMemberServiceDep,
) -> WorkspaceMember:
    try:
        return service.get_member(current_user, workspace_id, member_id)
    except WorkspaceNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found.",
        ) from exc
    except WorkspaceMemberNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace member not found.",
        ) from exc
