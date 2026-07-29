from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.deps import (
    CurrentUserDep,
    PermissionServiceDep,
    WorkspaceMemberServiceDep,
)
from app.models.workspace_member import WorkspaceMember
from app.schemas.workspace_member import (
    WorkspaceMemberList,
    WorkspaceMemberRead,
    WorkspaceMemberRoleUpdate,
)
from app.services.permission import (
    LastOwnerError,
    OwnerAlreadyExistsError,
    PermissionDeniedError,
    SelfRoleChangeError,
)
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


@router.patch(
    "/{workspace_id}/members/{member_id}/role",
    response_model=WorkspaceMemberRead,
)
def update_workspace_member_role(
    workspace_id: UUID,
    member_id: UUID,
    data: WorkspaceMemberRoleUpdate,
    current_user: CurrentUserDep,
    service: PermissionServiceDep,
) -> WorkspaceMember:
    try:
        return service.update_member_role(
            current_user,
            workspace_id,
            member_id,
            data,
        )
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
    except PermissionDeniedError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions.",
        ) from exc
    except SelfRoleChangeError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You cannot change your own role.",
        ) from exc
    except OwnerAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A workspace can only have one owner.",
        ) from exc
    except LastOwnerError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A workspace must keep at least one owner.",
        ) from exc
