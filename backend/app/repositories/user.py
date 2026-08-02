from collections.abc import Sequence
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate, UserProfileUpdate, UserUpdate


class UserRepository:
    """Contract for future user persistence operations."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_email(self, email: str) -> User | None:
        statement = select(User).where(User.email == email)
        return self.session.scalar(statement)

    def create(self, data: UserCreate, *, hashed_password: str) -> User:
        user = User(
            email=str(data.email),
            hashed_password=hashed_password,
            full_name=data.full_name,
        )
        self.session.add(user)

        try:
            self.session.commit()
            self.session.refresh(user)
        except IntegrityError as exc:
            self.session.rollback()
            raise UserEmailConflictError from exc
        except SQLAlchemyError:
            self.session.rollback()
            raise

        return user

    def get(self, user_id: UUID) -> User | None:
        return self.session.get(User, user_id)

    def update_profile(self, user: User, data: UserProfileUpdate) -> User:
        user.full_name = data.full_name
        user.avatar_url = str(data.avatar_url) if data.avatar_url else None
        return self._commit(user)

    def record_login(self, user: User) -> User:
        user.last_login_at = datetime.now(timezone.utc)
        return self._commit(user)

    def change_password(self, user: User, hashed_password: str) -> User:
        user.hashed_password = hashed_password
        user.auth_version += 1
        return self._commit(user)

    def deactivate_and_anonymize(
        self,
        user: User,
        *,
        hashed_password: str,
    ) -> None:
        user.email = f"deleted+{user.id}@taskminer.invalid"
        user.full_name = "Deleted user"
        user.avatar_url = None
        user.hashed_password = hashed_password
        user.is_active = False
        user.deleted_at = datetime.now(timezone.utc)
        user.auth_version += 1
        self._commit(user)

    def _commit(self, user: User) -> User:
        try:
            self.session.commit()
            self.session.refresh(user)
        except SQLAlchemyError:
            self.session.rollback()
            raise
        return user

    def list(self, *, offset: int = 0, limit: int = 100) -> Sequence[User]:
        raise NotImplementedError

    def update(self, user: User, data: UserUpdate) -> User:
        raise NotImplementedError

    def delete(self, user: User) -> None:
        raise NotImplementedError


class UserEmailConflictError(Exception):
    """Raised when persistence rejects a duplicate user email."""
