from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import hmac
from secrets import token_urlsafe
from uuid import UUID

from app.auth.google import GoogleCredentialVerifier, GoogleIdentityClaims
from app.core.security import create_access_token, hash_password
from app.models.external_auth import ExternalAuthAttempt, ExternalAuthAttemptPurpose
from app.models.user import User
from app.repositories.external_auth import (
    ExternalAuthConflictError,
    ExternalAuthRepository,
)


class ExternalAuthAttemptInvalidError(Exception):
    """Raised when an external-auth attempt is unknown, mismatched, or consumed."""


class ExternalAuthAttemptExpiredError(Exception):
    """Raised when the one-time external-auth attempt expired."""


class GoogleAccountLinkRequiredError(Exception):
    """Raised instead of merging a Google identity by matching email alone."""


class GoogleAccountLinkMismatchError(Exception):
    """Raised when authenticated TaskMiner and Google emails differ."""


class GoogleIdentityAlreadyLinkedError(Exception):
    """Raised when a Google identity is owned by another TaskMiner account."""


class GoogleAccountUnavailableError(Exception):
    """Raised when the matched TaskMiner account is inactive or deleted."""


@dataclass(frozen=True)
class ExternalAuthAttemptResult:
    attempt_id: UUID
    nonce: str
    expires_at: datetime


@dataclass(frozen=True)
class GoogleAuthenticationResult:
    access_token: str
    user: User
    is_new_user: bool


@dataclass(frozen=True)
class GoogleLinkResult:
    linked: bool
    already_linked: bool


class GoogleAuthService:
    """Bind verified Google subjects to TaskMiner's existing JWT sessions."""

    def __init__(
        self,
        repository: ExternalAuthRepository,
        verifier: GoogleCredentialVerifier,
        *,
        secret_key: str,
        attempt_lifetime: timedelta,
        clock: Callable[[], datetime] | None = None,
    ) -> None:
        self.repository = repository
        self.verifier = verifier
        self.secret_key = secret_key.encode()
        self.attempt_lifetime = attempt_lifetime
        self.clock = clock or (lambda: datetime.now(timezone.utc))

    def issue_attempt(
        self,
        *,
        purpose: ExternalAuthAttemptPurpose,
        user: User | None = None,
    ) -> ExternalAuthAttemptResult:
        if purpose == "link" and user is None:
            raise ValueError("Link attempts must be bound to an authenticated user.")
        if purpose == "authenticate" and user is not None:
            raise ValueError("Authentication attempts cannot be bound to a user.")
        now = self._now()
        nonce = token_urlsafe(32)
        attempt = self.repository.create_attempt(
            provider="google",
            purpose=purpose,
            nonce_hash=self._hash_nonce(nonce),
            expires_at=now + self.attempt_lifetime,
            user_id=user.id if user is not None else None,
            cleanup_before=now - timedelta(days=1),
        )
        return ExternalAuthAttemptResult(
            attempt_id=attempt.id,
            nonce=nonce,
            expires_at=attempt.expires_at,
        )

    def authenticate(
        self,
        *,
        attempt_id: UUID,
        nonce: str,
        credential: str,
    ) -> GoogleAuthenticationResult:
        claims = self.verifier.verify(credential, nonce=nonce)
        now = self._now()
        attempt = self._lock_valid_attempt(
            attempt_id,
            nonce=nonce,
            purpose="authenticate",
            user_id=None,
            now=now,
        )
        identity = self.repository.get_identity("google", claims.subject)
        if identity is not None:
            return self._login_existing(identity.user, identity, attempt, now=now)

        existing_user = self.repository.get_user_by_email(claims.email)
        if existing_user is not None:
            self.repository.consume_attempt(attempt, now=now)
            raise GoogleAccountLinkRequiredError

        try:
            user, _ = self.repository.create_user_identity(
                email=claims.email,
                full_name=self._full_name(claims),
                hashed_password=hash_password(token_urlsafe(48)),
                subject=claims.subject,
                attempt=attempt,
                now=now,
            )
        except ExternalAuthConflictError:
            # A concurrent attempt may have created either the identity or email.
            return self._resolve_concurrent_authentication(
                attempt_id=attempt_id,
                nonce=nonce,
                claims=claims,
                now=now,
            )
        return self._result(user, is_new_user=True)

    def is_linked(self, user: User) -> bool:
        return self.repository.get_user_identity(user.id, "google") is not None

    def link(
        self,
        user: User,
        *,
        attempt_id: UUID,
        nonce: str,
        credential: str,
    ) -> GoogleLinkResult:
        claims = self.verifier.verify(credential, nonce=nonce)
        now = self._now()
        attempt = self._lock_valid_attempt(
            attempt_id,
            nonce=nonce,
            purpose="link",
            user_id=user.id,
            now=now,
        )
        if claims.email != user.email.strip().lower():
            self.repository.consume_attempt(attempt, now=now)
            raise GoogleAccountLinkMismatchError

        subject_identity = self.repository.get_identity("google", claims.subject)
        if subject_identity is not None:
            self.repository.consume_attempt(attempt, now=now)
            if subject_identity.user_id == user.id:
                return GoogleLinkResult(linked=True, already_linked=True)
            raise GoogleIdentityAlreadyLinkedError

        user_identity = self.repository.get_user_identity(user.id, "google")
        if user_identity is not None:
            self.repository.consume_attempt(attempt, now=now)
            raise GoogleIdentityAlreadyLinkedError

        try:
            self.repository.link_identity(
                user,
                subject=claims.subject,
                attempt=attempt,
                now=now,
            )
        except ExternalAuthConflictError as exc:
            raise GoogleIdentityAlreadyLinkedError from exc
        return GoogleLinkResult(linked=True, already_linked=False)

    def _resolve_concurrent_authentication(
        self,
        *,
        attempt_id: UUID,
        nonce: str,
        claims: GoogleIdentityClaims,
        now: datetime,
    ) -> GoogleAuthenticationResult:
        attempt = self._lock_valid_attempt(
            attempt_id,
            nonce=nonce,
            purpose="authenticate",
            user_id=None,
            now=now,
        )
        identity = self.repository.get_identity("google", claims.subject)
        if identity is not None:
            return self._login_existing(identity.user, identity, attempt, now=now)
        if self.repository.get_user_by_email(claims.email) is not None:
            self.repository.consume_attempt(attempt, now=now)
            raise GoogleAccountLinkRequiredError
        self.repository.rollback()
        raise ExternalAuthConflictError

    def _login_existing(
        self,
        user: User,
        identity: object,
        attempt: ExternalAuthAttempt,
        *,
        now: datetime,
    ) -> GoogleAuthenticationResult:
        from app.models.external_auth import ExternalAuthIdentity

        assert isinstance(identity, ExternalAuthIdentity)
        if not user.is_active or user.deleted_at is not None:
            self.repository.consume_attempt(attempt, now=now)
            raise GoogleAccountUnavailableError
        logged_in_user = self.repository.complete_login(identity, attempt, now=now)
        return self._result(logged_in_user, is_new_user=False)

    def _lock_valid_attempt(
        self,
        attempt_id: UUID,
        *,
        nonce: str,
        purpose: ExternalAuthAttemptPurpose,
        user_id: UUID | None,
        now: datetime,
    ) -> ExternalAuthAttempt:
        attempt = self.repository.lock_attempt(attempt_id)
        if (
            attempt is None
            or attempt.provider != "google"
            or attempt.purpose != purpose
            or attempt.user_id != user_id
            or attempt.consumed_at is not None
            or not hmac.compare_digest(attempt.nonce_hash, self._hash_nonce(nonce))
        ):
            self.repository.rollback()
            raise ExternalAuthAttemptInvalidError
        if attempt.expires_at <= now:
            self.repository.consume_attempt(attempt, now=now)
            raise ExternalAuthAttemptExpiredError
        return attempt

    @staticmethod
    def _full_name(claims: GoogleIdentityClaims) -> str:
        return (claims.full_name or "Utilisateur Google")[:255]

    @staticmethod
    def _result(user: User, *, is_new_user: bool) -> GoogleAuthenticationResult:
        return GoogleAuthenticationResult(
            access_token=create_access_token(
                subject=str(user.id),
                token_version=user.auth_version,
            ),
            user=user,
            is_new_user=is_new_user,
        )

    def _hash_nonce(self, nonce: str) -> str:
        return hmac.new(self.secret_key, nonce.strip().encode(), sha256).hexdigest()

    def _now(self) -> datetime:
        return self.clock().astimezone(timezone.utc)
