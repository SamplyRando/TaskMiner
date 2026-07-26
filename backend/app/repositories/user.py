from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


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

    def list(self, *, offset: int = 0, limit: int = 100) -> Sequence[User]:
        raise NotImplementedError

    def update(self, user: User, data: UserUpdate) -> User:
        raise NotImplementedError

    def delete(self, user: User) -> None:
        raise NotImplementedError


class UserEmailConflictError(Exception):
    """Raised when persistence rejects a duplicate user email."""
