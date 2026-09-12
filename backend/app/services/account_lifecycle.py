from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import hmac
import logging
from secrets import token_urlsafe

from sqlalchemy.exc import SQLAlchemyError

from app.core.security import hash_password, verify_password
from app.email.provider import EmailProviderError
from app.email.service import EmailService
from app.models.account_action_token import (
    AccountActionTokenPurpose,
)
from app.models.user import User
from app.repositories.account_action_token import AccountActionTokenRepository
from app.repositories.user import UserRepository


logger = logging.getLogger(__name__)


class AccountActionTokenInvalidError(Exception):
    """Raised when a token is unknown, consumed, or no longer applicable."""


class AccountActionTokenExpiredError(Exception):
    """Raised when a known account action token has expired."""


class PasswordResetReuseError(Exception):
    """Raised when a password reset would keep the existing password."""


@dataclass(frozen=True)
class EmailVerificationResult:
    already_verified: bool


class AccountLifecycleService:
    """Issue and consume safe account lifecycle tokens."""

    def __init__(
        self,
        user_repository: UserRepository,
        token_repository: AccountActionTokenRepository,
        email_service: EmailService,
        *,
        secret_key: str,
        verification_token_lifetime: timedelta,
        password_reset_token_lifetime: timedelta,
        verification_resend_cooldown: timedelta,
        password_reset_cooldown: timedelta,
        clock: Callable[[], datetime] | None = None,
    ) -> None:
        self.user_repository = user_repository
        self.token_repository = token_repository
        self.email_service = email_service
        self.secret_key = secret_key.encode()
        self.verification_token_lifetime = verification_token_lifetime
        self.password_reset_token_lifetime = password_reset_token_lifetime
        self.verification_resend_cooldown = verification_resend_cooldown
        self.password_reset_cooldown = password_reset_cooldown
        self.clock = clock or (lambda: datetime.now(timezone.utc))

    def send_initial_verification(self, user: User) -> None:
        if user.email_verified_at is not None:
            return
        self._safe_issue_and_send(
            user,
            purpose="email_verification",
            lifetime=self.verification_token_lifetime,
            cooldown=None,
        )

    def request_email_verification(self, email: str) -> None:
        user = self._eligible_user(email)
        if user is None or user.email_verified_at is not None:
            return
        self._safe_issue_and_send(
            user,
            purpose="email_verification",
            lifetime=self.verification_token_lifetime,
            cooldown=self.verification_resend_cooldown,
        )

    def verify_email(self, raw_token: str) -> EmailVerificationResult:
        now = self._now()
        token = self.token_repository.get_by_hash_for_update(
            self._hash_token(raw_token),
            "email_verification",
        )
        if token is None or not self._user_is_eligible(token.user):
            self.token_repository.rollback()
            raise AccountActionTokenInvalidError
        if token.consumed_at is not None:
            already_verified = token.user.email_verified_at is not None
            self.token_repository.rollback()
            if already_verified:
                return EmailVerificationResult(already_verified=True)
            raise AccountActionTokenInvalidError
        if token.expires_at <= now:
            self.token_repository.mark_consumed(token, now=now)
            raise AccountActionTokenExpiredError

        already_verified = token.user.email_verified_at is not None
        self.token_repository.consume_email_verification(token, now=now)
        return EmailVerificationResult(already_verified=already_verified)

    def request_password_reset(self, email: str) -> None:
        user = self._eligible_user(email)
        if user is None:
            return
        self._safe_issue_and_send(
            user,
            purpose="password_reset",
            lifetime=self.password_reset_token_lifetime,
            cooldown=self.password_reset_cooldown,
        )

    def reset_password(self, raw_token: str, new_password: str) -> None:
        now = self._now()
        token = self.token_repository.get_by_hash_for_update(
            self._hash_token(raw_token),
            "password_reset",
        )
        if token is None or not self._user_is_eligible(token.user):
            self.token_repository.rollback()
            raise AccountActionTokenInvalidError
        if token.consumed_at is not None:
            self.token_repository.rollback()
            raise AccountActionTokenInvalidError
        if token.expires_at <= now:
            self.token_repository.mark_consumed(token, now=now)
            raise AccountActionTokenExpiredError
        if token.issued_auth_version != token.user.auth_version:
            self.token_repository.mark_consumed(token, now=now)
            raise AccountActionTokenInvalidError
        if verify_password(new_password, token.user.hashed_password):
            self.token_repository.rollback()
            raise PasswordResetReuseError

        self.token_repository.consume_password_reset(
            token,
            hashed_password=hash_password(new_password),
            now=now,
        )

    def _safe_issue_and_send(
        self,
        user: User,
        *,
        purpose: AccountActionTokenPurpose,
        lifetime: timedelta,
        cooldown: timedelta | None,
    ) -> None:
        try:
            self._issue_and_send(
                user,
                purpose=purpose,
                lifetime=lifetime,
                cooldown=cooldown,
            )
        except SQLAlchemyError:
            self.token_repository.rollback()
            logger.exception(
                "Account lifecycle token persistence failed for user_id=%s purpose=%s",
                user.id,
                purpose,
            )

    def _issue_and_send(
        self,
        user: User,
        *,
        purpose: AccountActionTokenPurpose,
        lifetime: timedelta,
        cooldown: timedelta | None,
    ) -> None:
        locked_user = self.token_repository.lock_user(user.id)
        if locked_user is None or not self._user_is_eligible(locked_user):
            self.token_repository.rollback()
            return
        if (
            purpose == "email_verification"
            and locked_user.email_verified_at is not None
        ):
            self.token_repository.rollback()
            return

        now = self._now()
        last_created_at = self.token_repository.get_latest_created_at(
            locked_user.id,
            purpose,
        )
        if (
            cooldown is not None
            and last_created_at is not None
            and last_created_at > now - cooldown
        ):
            self.token_repository.rollback()
            return

        raw_token = token_urlsafe(32)
        token = self.token_repository.replace_active(
            locked_user,
            purpose=purpose,
            token_hash=self._hash_token(raw_token),
            expires_at=now + lifetime,
            now=now,
        )
        try:
            if purpose == "email_verification":
                self.email_service.send_email_verification(
                    recipient=locked_user.email,
                    token=raw_token,
                    expires_at=token.expires_at,
                    idempotency_key=f"account-email-verification/{token.id}",
                )
            else:
                self.email_service.send_password_reset(
                    recipient=locked_user.email,
                    token=raw_token,
                    expires_at=token.expires_at,
                    idempotency_key=f"account-password-reset/{token.id}",
                )
        except EmailProviderError:
            logger.warning(
                "Account lifecycle email delivery failed for user_id=%s purpose=%s",
                locked_user.id,
                purpose,
            )

    def _eligible_user(self, email: str) -> User | None:
        user = self.user_repository.get_by_email(email.strip().lower())
        return user if user is not None and self._user_is_eligible(user) else None

    @staticmethod
    def _user_is_eligible(user: User) -> bool:
        return user.is_active and user.deleted_at is None

    def _hash_token(self, raw_token: str) -> str:
        return hmac.new(self.secret_key, raw_token.strip().encode(), sha256).hexdigest()

    def _now(self) -> datetime:
        return self.clock().astimezone(timezone.utc)
