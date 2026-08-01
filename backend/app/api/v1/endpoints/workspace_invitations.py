from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUserDep, WorkspaceInvitationServiceDep
from app.models.workspace_invitation import WorkspaceInvitation
from app.schemas.workspace_invitation import (
    InvitationAccept,
    InvitationCreate,
    InvitationList,
    InvitationListParams,
    InvitationRead,
)
from app.services.permission import PermissionDeniedError
from app.services.workspace import WorkspaceNotFoundError
from app.services.workspace_invitation import (
    InvitationAlreadyAcceptedError,
    InvitationEmailMismatchError,
    InvitationExpiredError,
    InvitationMemberAlreadyExistsError,
    InvitationNotFoundError,
    InvitationOwnerRoleError,
    InvitationRevokedError,
)


router = APIRouter()
workspace_router = APIRouter()


@workspace_router.post(
    "/{workspace_id}/invitations",
    response_model=InvitationRead,
    status_code=status.HTTP_201_CREATED,
)
def create_workspace_invitation(
    workspace_id: UUID,
    data: InvitationCreate,
    current_user: CurrentUserDep,
    service: WorkspaceInvitationServiceDep,
) -> WorkspaceInvitation:
    try:
        return service.create_invitation(current_user, workspace_id, data)
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
    except InvitationOwnerRoleError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A workspace can only have one owner.",
        ) from exc


@workspace_router.get(
    "/{workspace_id}/invitations",
    response_model=InvitationList,
)
def list_workspace_invitations(
    workspace_id: UUID,
    current_user: CurrentUserDep,
    service: WorkspaceInvitationServiceDep,
    params: Annotated[InvitationListParams, Query()],
) -> InvitationList:
    try:
        return service.list_invitations(current_user, workspace_id, params)
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


@router.get("/{token}", response_model=InvitationRead)
def get_workspace_invitation(
    token: str,
    current_user: CurrentUserDep,
    service: WorkspaceInvitationServiceDep,
) -> WorkspaceInvitation:
    try:
        return service.get_invitation(current_user, token)
    except InvitationNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found.",
        ) from exc


@router.post("/{token}/accept", response_model=InvitationAccept)
def accept_workspace_invitation(
    token: str,
    current_user: CurrentUserDep,
    service: WorkspaceInvitationServiceDep,
) -> WorkspaceInvitation:
    try:
        return service.accept_invitation(current_user, token)
    except InvitationNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found.",
        ) from exc
    except InvitationEmailMismatchError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invitation belongs to another email address.",
        ) from exc
    except InvitationExpiredError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Invitation has expired.",
        ) from exc
    except InvitationRevokedError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Invitation has been revoked.",
        ) from exc
    except InvitationAlreadyAcceptedError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Invitation has already been accepted.",
        ) from exc
    except InvitationMemberAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a workspace member.",
        ) from exc
    except InvitationOwnerRoleError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A workspace can only have one owner.",
        ) from exc


@router.post("/{token}/revoke", response_model=InvitationRead)
def revoke_workspace_invitation(
    token: str,
    current_user: CurrentUserDep,
    service: WorkspaceInvitationServiceDep,
) -> WorkspaceInvitation:
    try:
        return service.revoke_invitation(current_user, token)
    except (InvitationNotFoundError, WorkspaceNotFoundError) as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found.",
        ) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions.",
        ) from exc
    except InvitationExpiredError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Invitation has expired.",
        ) from exc
    except InvitationRevokedError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Invitation has been revoked.",
        ) from exc
    except InvitationAlreadyAcceptedError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Accepted invitations cannot be revoked.",
        ) from exc
