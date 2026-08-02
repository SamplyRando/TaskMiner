from secrets import token_urlsafe
from uuid import UUID

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.models.user_preference import UserPreference
from app.models.workspace_member import WorkspaceMemberRole
from app.repositories.user import UserRepository
from app.repositories.user_preference import UserPreferenceRepository
from app.repositories.workspace import WorkspaceRepository
from app.repositories.workspace_member import WorkspaceMemberRepository
from app.schemas.user import (
    DangerConfirmation,
    PasswordChange,
    UserPreferenceUpdate,
    UserProfileRead,
    UserProfileUpdate,
)
from app.services.workspace import WorkspaceNotFoundError


class InvalidCurrentPasswordError(Exception):
    """Raised when a sensitive change cannot verify the current password."""


class PasswordReuseError(Exception):
    """Raised when a user attempts to keep the current password."""


class OwnedWorkspaceLeaveError(Exception):
    """Raised when an owner attempts to leave their own workspace."""


class MembershipNotFoundError(Exception):
    """Raised when the user does not belong to the selected workspace."""


class OwnedWorkspacesExistError(Exception):
    """Raised when account deletion would orphan active workspaces."""


class SettingsService:
    """Application service for account settings and sensitive actions."""

    def __init__(
        self,
        user_repository: UserRepository,
        preference_repository: UserPreferenceRepository,
        workspace_repository: WorkspaceRepository,
        member_repository: WorkspaceMemberRepository,
    ) -> None:
        self.user_repository = user_repository
        self.preference_repository = preference_repository
        self.workspace_repository = workspace_repository
        self.member_repository = member_repository

    def get_profile(self, user: User) -> UserProfileRead:
        return UserProfileRead(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at,
            last_login_at=user.last_login_at,
            primary_role=self.member_repository.get_primary_role(user.id),
        )

    def update_profile(self, user: User, data: UserProfileUpdate) -> UserProfileRead:
        updated = self.user_repository.update_profile(user, data)
        return self.get_profile(updated)

    def change_password(self, user: User, data: PasswordChange) -> str:
        if not verify_password(data.current_password, user.hashed_password):
            raise InvalidCurrentPasswordError
        if verify_password(data.new_password, user.hashed_password):
            raise PasswordReuseError

        updated = self.user_repository.change_password(
            user,
            hash_password(data.new_password),
        )
        return create_access_token(
            subject=str(updated.id),
            token_version=updated.auth_version,
        )

    def get_preferences(self, user: User) -> UserPreference:
        return self.preference_repository.get_or_create(user)

    def update_preferences(
        self,
        user: User,
        data: UserPreferenceUpdate,
    ) -> UserPreference:
        preference = self.preference_repository.get_or_create(user)
        return self.preference_repository.update(preference, data)

    def delete_account(self, user: User, data: DangerConfirmation) -> None:
        self._verify_password(user, data.current_password)
        if self.workspace_repository.get_first_active_by_owner(user) is not None:
            raise OwnedWorkspacesExistError
        self.user_repository.deactivate_and_anonymize(
            user,
            hashed_password=hash_password(token_urlsafe(48)),
        )

    def leave_workspace(
        self,
        user: User,
        workspace_id: UUID,
        data: DangerConfirmation,
    ) -> None:
        self._verify_password(user, data.current_password)
        workspace = self.workspace_repository.get_active(workspace_id)
        if workspace is None:
            raise WorkspaceNotFoundError
        member = self.member_repository.get_by_workspace_and_user(
            workspace,
            user.id,
        )
        if member is None:
            raise MembershipNotFoundError
        if member.role == WorkspaceMemberRole.OWNER or workspace.owner_id == user.id:
            raise OwnedWorkspaceLeaveError
        self.member_repository.delete(member)

    @staticmethod
    def _verify_password(user: User, password: str) -> None:
        if not verify_password(password, user.hashed_password):
            raise InvalidCurrentPasswordError
