from datetime import datetime
from typing import Literal, Self
from uuid import UUID

from pydantic import (
    AnyHttpUrl,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

from app.models.user_preference import UserAccent, UserMotion, UserTheme
from app.models.workspace_member import WorkspaceMemberRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    is_active: bool | None = None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    full_name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    full_name: str = Field(min_length=2, max_length=255)
    avatar_url: AnyHttpUrl | None = None

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if not all(
            character.isalpha() or character in " -'." for character in normalized
        ):
            raise ValueError("full_name contains unsupported characters")
        return normalized


class UserProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    email: EmailStr
    full_name: str
    avatar_url: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_login_at: datetime | None
    primary_role: WorkspaceMemberRole | None


class PasswordChange(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)
    confirmation: str = Field(min_length=1, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        requirements = (
            any(character.isupper() for character in value),
            any(character.islower() for character in value),
            any(character.isdigit() for character in value),
            any(not character.isalnum() for character in value),
        )
        if not all(requirements):
            raise ValueError(
                "new_password must contain uppercase, lowercase, digit, "
                "and special characters"
            )
        return value

    @model_validator(mode="after")
    def validate_confirmation(self) -> Self:
        if self.new_password != self.confirmation:
            raise ValueError("password confirmation does not match")
        return self


class UserPreferenceUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    theme: UserTheme | None = None
    motion: UserMotion | None = None
    items_per_page: Literal[10, 20, 50, 100] | None = None
    dashboard_period: Literal[7, 30, 90] | None = None
    accent: UserAccent | None = None
    notify_activity_feed: bool | None = None
    notify_audit: bool | None = None
    notify_invitations: bool | None = None
    notify_comments: bool | None = None
    notify_assignments: bool | None = None


class UserPreferenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    theme: UserTheme
    motion: UserMotion
    items_per_page: Literal[10, 20, 50, 100]
    dashboard_period: Literal[7, 30, 90]
    accent: UserAccent
    notify_activity_feed: bool
    notify_audit: bool
    notify_invitations: bool
    notify_comments: bool
    notify_assignments: bool


class DangerConfirmation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    confirmation: Literal["DELETE", "SUPPRIMER"]
    current_password: str = Field(min_length=1, max_length=128)
