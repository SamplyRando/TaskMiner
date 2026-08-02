from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUserDep, SettingsServiceDep
from app.models.user_preference import UserPreference
from app.schemas.auth import TokenResponse
from app.schemas.user import (
    DangerConfirmation,
    PasswordChange,
    UserPreferenceRead,
    UserPreferenceUpdate,
    UserProfileRead,
    UserProfileUpdate,
)
from app.services.settings import (
    InvalidCurrentPasswordError,
    MembershipNotFoundError,
    OwnedWorkspacesExistError,
    OwnedWorkspaceLeaveError,
    PasswordReuseError,
)
from app.services.workspace import WorkspaceNotFoundError


router = APIRouter()


@router.get("")
def list_users_placeholder() -> dict[str, str]:
    return {"message": "Not implemented yet"}


@router.get("/me", response_model=UserProfileRead)
def get_current_profile(
    current_user: CurrentUserDep,
    service: SettingsServiceDep,
) -> UserProfileRead:
    return service.get_profile(current_user)


@router.patch("/me", response_model=UserProfileRead)
def update_current_profile(
    data: UserProfileUpdate,
    current_user: CurrentUserDep,
    service: SettingsServiceDep,
) -> UserProfileRead:
    return service.update_profile(current_user, data)


@router.put("/me/password", response_model=TokenResponse)
def change_current_password(
    data: PasswordChange,
    current_user: CurrentUserDep,
    service: SettingsServiceDep,
) -> TokenResponse:
    try:
        token = service.change_password(current_user, data)
    except InvalidCurrentPasswordError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        ) from exc
    except PasswordReuseError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The new password must be different from the current password.",
        ) from exc
    return TokenResponse(access_token=token)


@router.get("/me/preferences", response_model=UserPreferenceRead)
def get_current_preferences(
    current_user: CurrentUserDep,
    service: SettingsServiceDep,
) -> UserPreference:
    return service.get_preferences(current_user)


@router.patch("/me/preferences", response_model=UserPreferenceRead)
def update_current_preferences(
    data: UserPreferenceUpdate,
    current_user: CurrentUserDep,
    service: SettingsServiceDep,
) -> UserPreference:
    return service.update_preferences(current_user, data)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_current_account(
    data: DangerConfirmation,
    current_user: CurrentUserDep,
    service: SettingsServiceDep,
) -> None:
    try:
        service.delete_account(current_user, data)
    except InvalidCurrentPasswordError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        ) from exc
    except OwnedWorkspacesExistError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Delete or transfer your owned workspaces before deleting your account."
            ),
        ) from exc


@router.delete(
    "/me/workspaces/{workspace_id}/membership",
    status_code=status.HTTP_204_NO_CONTENT,
)
def leave_current_workspace(
    workspace_id: UUID,
    data: DangerConfirmation,
    current_user: CurrentUserDep,
    service: SettingsServiceDep,
) -> None:
    try:
        service.leave_workspace(current_user, workspace_id, data)
    except (WorkspaceNotFoundError, MembershipNotFoundError) as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found.",
        ) from exc
    except OwnedWorkspaceLeaveError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The workspace owner cannot leave their workspace.",
        ) from exc
    except InvalidCurrentPasswordError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        ) from exc
