from collections.abc import Callable, Iterable
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import hmac
from ipaddress import ip_address
from math import ceil
from typing import Literal

from app.repositories.request_rate_limit import RequestRateLimitRepository


class RequestRateLimitExceededError(Exception):
    """Raised before a protected operation exceeds its shared request budget."""

    def __init__(self, retry_after_seconds: int) -> None:
        self.retry_after_seconds = retry_after_seconds
        super().__init__("Too many requests.")


@dataclass(frozen=True)
class RateLimitScope:
    kind: str
    value: str


class RequestRateLimitService:
    """Reserve privacy-preserving fixed-window counters in PostgreSQL."""

    def __init__(
        self,
        repository: RequestRateLimitRepository,
        secret_key: str,
        *,
        clock: Callable[[], datetime] | None = None,
    ) -> None:
        self.repository = repository
        self.secret_key = secret_key.encode()
        self.clock = clock or (lambda: datetime.now(timezone.utc))

    def enforce(
        self,
        *,
        action: str,
        scopes: Iterable[RateLimitScope],
        limit: int,
        window_seconds: int,
    ) -> None:
        now = self.clock().astimezone(timezone.utc)
        epoch = int(now.timestamp())
        window_epoch = epoch - (epoch % window_seconds)
        window_start = datetime.fromtimestamp(window_epoch, tz=timezone.utc)
        retry_after = max(
            1,
            ceil(
                (window_start + timedelta(seconds=window_seconds) - now).total_seconds()
            ),
        )
        hashed_scopes = sorted(
            (
                scope.kind,
                hmac.new(
                    self.secret_key,
                    f"{scope.kind}:{scope.value}".encode(),
                    sha256,
                ).hexdigest(),
            )
            for scope in scopes
        )
        try:
            self.repository.delete_before(window_start - timedelta(days=1))
            for scope_type, scope_hash in hashed_scopes:
                if not self.repository.reserve(
                    action=action,
                    scope_type=scope_type,
                    scope_hash=scope_hash,
                    window_start=window_start,
                    limit=limit,
                ):
                    raise RequestRateLimitExceededError(retry_after)
            self.repository.commit()
        except Exception:
            self.repository.rollback()
            raise


AuthRateLimitAction = Literal[
    "email_verification",
    "login",
    "password_reset",
    "register",
]


class AuthRateLimitService:
    """Apply the same limit to the caller IP and normalized email identity."""

    def __init__(
        self,
        rate_limiter: RequestRateLimitService,
        *,
        login_requests: int,
        login_window_seconds: int,
        register_requests: int,
        register_window_seconds: int,
        password_reset_requests: int,
        password_reset_window_seconds: int,
        email_verification_requests: int,
        email_verification_window_seconds: int,
        trusted_proxy_hops: int,
    ) -> None:
        self.rate_limiter = rate_limiter
        self.login_requests = login_requests
        self.login_window_seconds = login_window_seconds
        self.register_requests = register_requests
        self.register_window_seconds = register_window_seconds
        self.password_reset_requests = password_reset_requests
        self.password_reset_window_seconds = password_reset_window_seconds
        self.email_verification_requests = email_verification_requests
        self.email_verification_window_seconds = email_verification_window_seconds
        self.trusted_proxy_hops = trusted_proxy_hops

    def enforce(
        self,
        action: AuthRateLimitAction,
        *,
        email: str,
        peer_host: str | None,
        real_ip: str | None,
        forwarded_for: str | None,
    ) -> None:
        address = resolve_client_address(
            peer_host,
            forwarded_for,
            real_ip=real_ip,
            trusted_proxy_hops=self.trusted_proxy_hops,
        )
        if action == "login":
            limit = self.login_requests
            window = self.login_window_seconds
        elif action == "register":
            limit = self.register_requests
            window = self.register_window_seconds
        elif action == "password_reset":
            limit = self.password_reset_requests
            window = self.password_reset_window_seconds
        else:
            limit = self.email_verification_requests
            window = self.email_verification_window_seconds
        self.rate_limiter.enforce(
            action=f"auth_{action}",
            scopes=(
                RateLimitScope("ip", address),
                RateLimitScope("identity", email.strip().lower()),
            ),
            limit=limit,
            window_seconds=window,
        )


def resolve_client_address(
    peer_host: str | None,
    forwarded_for: str | None,
    *,
    real_ip: str | None = None,
    trusted_proxy_hops: int,
) -> str:
    if real_address := _normalized_ip((real_ip or "").strip()):
        return real_address

    peer_address = _normalized_ip(peer_host or "")
    forwarded_addresses = [
        normalized
        for candidate in (forwarded_for or "").split(",")
        if (normalized := _normalized_ip(candidate.strip())) is not None
    ]
    chain = forwarded_addresses + ([peer_address] if peer_address else [])
    if trusted_proxy_hops > 0 and len(chain) > trusted_proxy_hops:
        return chain[-(trusted_proxy_hops + 1)]
    return peer_address or "unknown"


def _normalized_ip(value: str) -> str | None:
    try:
        return ip_address(value).compressed
    except ValueError:
        return None
