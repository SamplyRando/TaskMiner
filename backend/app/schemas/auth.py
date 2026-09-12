from typing import Literal, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

from app.schemas.user import validate_password_strength


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"


class AccountEmailRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr


class AccountTokenRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    token: str = Field(min_length=32, max_length=512)


class PasswordResetConfirmRequest(AccountTokenRequest):
    new_password: str = Field(min_length=12, max_length=128)
    confirmation: str = Field(min_length=1, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_new_password_strength(cls, value: str) -> str:
        return validate_password_strength(value)

    @model_validator(mode="after")
    def validate_confirmation(self) -> Self:
        if self.new_password != self.confirmation:
            raise ValueError("password confirmation does not match")
        return self


class AccountActionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str
    already_completed: bool = False
