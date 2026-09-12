from datetime import datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.account_action_token import (
    AccountActionToken,
    AccountActionTokenPurpose,
)
from app.models.user import User


class AccountActionTokenRepository:
    """Persistence operations for one-time account action tokens."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def lock_user(self, user_id: UUID) -> User | None:
        statement = select(User).where(User.id == user_id).with_for_update()
        return self.session.scalar(statement)

    def get_latest_created_at(
        self,
        user_id: UUID,
        purpose: AccountActionTokenPurpose,
    ) -> datetime | None:
        statement = (
            select(AccountActionToken.created_at)
            .where(
                AccountActionToken.user_id == user_id,
                AccountActionToken.purpose == purpose,
            )
            .order_by(AccountActionToken.created_at.desc())
            .limit(1)
        )
        return self.session.scalar(statement)

    def replace_active(
        self,
        user: User,
        *,
        purpose: AccountActionTokenPurpose,
        token_hash: str,
        expires_at: datetime,
        now: datetime,
    ) -> AccountActionToken:
        self.session.execute(
            update(AccountActionToken)
            .where(
                AccountActionToken.user_id == user.id,
                AccountActionToken.purpose == purpose,
                AccountActionToken.consumed_at.is_(None),
            )
            .values(consumed_at=now)
        )
        token = AccountActionToken(
            user_id=user.id,
            purpose=purpose,
            token_hash=token_hash,
            issued_auth_version=user.auth_version,
            expires_at=expires_at,
        )
        self.session.add(token)
        self._commit()
        self.session.refresh(token)
        return token

    def get_by_hash_for_update(
        self,
        token_hash: str,
        purpose: AccountActionTokenPurpose,
    ) -> AccountActionToken | None:
        candidate = self.session.scalar(
            select(AccountActionToken).where(
                AccountActionToken.token_hash == token_hash,
                AccountActionToken.purpose == purpose,
            )
        )
        if candidate is None:
            return None
        user = self.session.scalar(
            select(User).where(User.id == candidate.user_id).with_for_update()
        )
        if user is None:
            return None
        return self.session.scalar(
            select(AccountActionToken)
            .where(
                AccountActionToken.id == candidate.id,
                AccountActionToken.purpose == purpose,
            )
            .with_for_update()
            .execution_options(populate_existing=True)
        )

    def consume_email_verification(
        self,
        token: AccountActionToken,
        *,
        now: datetime,
    ) -> None:
        if token.user.email_verified_at is None:
            token.user.email_verified_at = now
        token.consumed_at = now
        self._commit()

    def consume_password_reset(
        self,
        token: AccountActionToken,
        *,
        hashed_password: str,
        now: datetime,
    ) -> None:
        token.user.hashed_password = hashed_password
        token.user.auth_version += 1
        token.consumed_at = now
        self.session.execute(
            update(AccountActionToken)
            .where(
                AccountActionToken.user_id == token.user_id,
                AccountActionToken.purpose == "password_reset",
                AccountActionToken.id != token.id,
                AccountActionToken.consumed_at.is_(None),
            )
            .values(consumed_at=now)
        )
        self._commit()

    def mark_consumed(
        self,
        token: AccountActionToken,
        *,
        now: datetime,
    ) -> None:
        token.consumed_at = now
        self._commit()

    def rollback(self) -> None:
        self.session.rollback()

    def _commit(self) -> None:
        try:
            self.session.commit()
        except SQLAlchemyError:
            self.session.rollback()
            raise
