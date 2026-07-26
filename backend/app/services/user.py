from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.repositories.user import UserEmailConflictError, UserRepository
from app.schemas.user import UserCreate


class UserAlreadyExistsError(Exception):
    """Raised when an email address is already registered."""


class InvalidCredentialsError(Exception):
    """Raised when user authentication cannot be completed."""


class UserService:
    """Application service for user-related use cases."""

    def __init__(self, repository: UserRepository) -> None:
        self.repository = repository

    def register(self, data: UserCreate) -> User:
        normalized_data = UserCreate(
            email=str(data.email).lower(),
            password=data.password,
            full_name=data.full_name,
        )
        if self.repository.get_by_email(str(normalized_data.email)) is not None:
            raise UserAlreadyExistsError

        hashed_password = hash_password(normalized_data.password)
        try:
            return self.repository.create(
                normalized_data,
                hashed_password=hashed_password,
            )
        except UserEmailConflictError as exc:
            raise UserAlreadyExistsError from exc

    def authenticate(self, email: str, password: str) -> str:
        normalized_email = email.strip().lower()
        user = self.repository.get_by_email(normalized_email)
        if user is None or not user.is_active:
            raise InvalidCredentialsError

        if not verify_password(password, user.hashed_password):
            raise InvalidCredentialsError

        return create_access_token(subject=str(user.id))
