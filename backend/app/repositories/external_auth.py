from datetime import datetime
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.external_auth import (
    ExternalAuthAttempt,
    ExternalAuthAttemptPurpose,
    ExternalAuthIdentity,
    ExternalAuthProvider,
)
from app.models.user import User


class ExternalAuthConflictError(Exception):
    """Raised when a concurrent request created the same identity/account."""


class ExternalAuthRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create_attempt(
        self,
        *,
        provider: ExternalAuthProvider,
        purpose: ExternalAuthAttemptPurpose,
        nonce_hash: str,
        expires_at: datetime,
        user_id: UUID | None,
        cleanup_before: datetime,
    ) -> ExternalAuthAttempt:
        self.session.execute(
            delete(ExternalAuthAttempt).where(
                ExternalAuthAttempt.expires_at < cleanup_before
            )
        )
        attempt = ExternalAuthAttempt(
            provider=provider,
            purpose=purpose,
            nonce_hash=nonce_hash,
            expires_at=expires_at,
            user_id=user_id,
        )
        self.session.add(attempt)
        self._commit()
        self.session.refresh(attempt)
        return attempt

    def lock_attempt(self, attempt_id: UUID) -> ExternalAuthAttempt | None:
        return self.session.scalar(
            select(ExternalAuthAttempt)
            .where(ExternalAuthAttempt.id == attempt_id)
            .with_for_update()
        )

    def get_identity(
        self,
        provider: ExternalAuthProvider,
        subject: str,
    ) -> ExternalAuthIdentity | None:
        return self.session.scalar(
            select(ExternalAuthIdentity).where(
                ExternalAuthIdentity.provider == provider,
                ExternalAuthIdentity.provider_subject == subject,
            )
        )

    def get_user_identity(
        self,
        user_id: UUID,
        provider: ExternalAuthProvider,
    ) -> ExternalAuthIdentity | None:
        return self.session.scalar(
            select(ExternalAuthIdentity).where(
                ExternalAuthIdentity.user_id == user_id,
                ExternalAuthIdentity.provider == provider,
            )
        )

    def get_user_by_email(self, email: str) -> User | None:
        return self.session.scalar(select(User).where(User.email == email))

    def create_user_identity(
        self,
        *,
        email: str,
        full_name: str,
        hashed_password: str,
        subject: str,
        attempt: ExternalAuthAttempt,
        now: datetime,
    ) -> tuple[User, ExternalAuthIdentity]:
        user = User(
            email=email,
            full_name=full_name,
            hashed_password=hashed_password,
            email_verified_at=now,
            last_login_at=now,
        )
        identity = ExternalAuthIdentity(
            provider="google",
            provider_subject=subject,
            last_login_at=now,
            user=user,
        )
        attempt.consumed_at = now
        self.session.add_all((user, identity))
        self._commit_conflict_safe()
        self.session.refresh(user)
        self.session.refresh(identity)
        return user, identity

    def complete_login(
        self,
        identity: ExternalAuthIdentity,
        attempt: ExternalAuthAttempt,
        *,
        now: datetime,
    ) -> User:
        identity.last_login_at = now
        identity.user.last_login_at = now
        attempt.consumed_at = now
        self._commit()
        self.session.refresh(identity.user)
        return identity.user

    def consume_attempt(
        self,
        attempt: ExternalAuthAttempt,
        *,
        now: datetime,
    ) -> None:
        attempt.consumed_at = now
        self._commit()

    def link_identity(
        self,
        user: User,
        *,
        subject: str,
        attempt: ExternalAuthAttempt,
        now: datetime,
    ) -> ExternalAuthIdentity:
        identity = ExternalAuthIdentity(
            user_id=user.id,
            provider="google",
            provider_subject=subject,
            last_login_at=now,
        )
        attempt.consumed_at = now
        self.session.add(identity)
        self._commit_conflict_safe()
        self.session.refresh(identity)
        return identity

    def rollback(self) -> None:
        self.session.rollback()

    def _commit_conflict_safe(self) -> None:
        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise ExternalAuthConflictError from exc
        except SQLAlchemyError:
            self.session.rollback()
            raise

    def _commit(self) -> None:
        try:
            self.session.commit()
        except SQLAlchemyError:
            self.session.rollback()
            raise
