from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.database import SessionLocal
from app.models.request_rate_limit_bucket import RequestRateLimitBucket
from app.repositories.request_rate_limit import RequestRateLimitRepository
from app.services.request_rate_limit import (
    AuthRateLimitService,
    RateLimitScope,
    RequestRateLimitExceededError,
    RequestRateLimitService,
    resolve_client_address,
)


def test_postgresql_rate_limit_is_shared_across_service_instances(
    database_session: Session,
) -> None:
    del database_session
    now = datetime(2026, 9, 9, 12, 0, tzinfo=timezone.utc)
    with SessionLocal() as first_session, SessionLocal() as second_session:
        first = RequestRateLimitService(
            RequestRateLimitRepository(first_session),
            "rate-limit-test-secret",
            clock=lambda: now,
        )
        second = RequestRateLimitService(
            RequestRateLimitRepository(second_session),
            "rate-limit-test-secret",
            clock=lambda: now,
        )
        scope = (RateLimitScope("identity", "user@example.com"),)

        first.enforce(action="auth_login", scopes=scope, limit=2, window_seconds=60)
        second.enforce(action="auth_login", scopes=scope, limit=2, window_seconds=60)

        with pytest.raises(RequestRateLimitExceededError) as error:
            first.enforce(action="auth_login", scopes=scope, limit=2, window_seconds=60)
        assert error.value.retry_after_seconds == 60


def test_rate_limit_scopes_and_windows_are_independent(
    database_session: Session,
) -> None:
    current = [datetime(2026, 9, 9, 12, 0, tzinfo=timezone.utc)]
    service = RequestRateLimitService(
        RequestRateLimitRepository(database_session),
        "rate-limit-test-secret",
        clock=lambda: current[0],
    )

    service.enforce(
        action="auth_login",
        scopes=(RateLimitScope("ip", "192.0.2.1"),),
        limit=1,
        window_seconds=60,
    )
    service.enforce(
        action="auth_login",
        scopes=(RateLimitScope("ip", "192.0.2.2"),),
        limit=1,
        window_seconds=60,
    )
    current[0] += timedelta(seconds=60)
    service.enforce(
        action="auth_login",
        scopes=(RateLimitScope("ip", "192.0.2.1"),),
        limit=1,
        window_seconds=60,
    )


def test_auth_rate_limit_normalizes_email_across_different_ips(
    database_session: Session,
) -> None:
    limiter = RequestRateLimitService(
        RequestRateLimitRepository(database_session),
        "rate-limit-test-secret",
        clock=lambda: datetime(2026, 9, 9, 12, 0, tzinfo=timezone.utc),
    )
    auth = AuthRateLimitService(
        limiter,
        login_requests=1,
        login_window_seconds=60,
        register_requests=1,
        register_window_seconds=60,
        trusted_proxy_hops=0,
    )
    auth.enforce(
        "login",
        email="USER@EXAMPLE.COM",
        peer_host="192.0.2.1",
        real_ip=None,
        forwarded_for=None,
    )

    with pytest.raises(RequestRateLimitExceededError):
        auth.enforce(
            "login",
            email="user@example.com",
            peer_host="192.0.2.2",
            real_ip=None,
            forwarded_for=None,
        )
    stored_hashes = list(
        database_session.scalars(select(RequestRateLimitBucket.scope_hash)).all()
    )
    assert stored_hashes
    assert all("user@example.com" not in value for value in stored_hashes)
    assert all("192.0.2" not in value for value in stored_hashes)


def test_client_address_uses_an_explicit_trusted_proxy_hop_count() -> None:
    forwarded = "198.51.100.8, 10.0.0.10"

    assert (
        resolve_client_address(
            "10.0.0.20",
            forwarded,
            trusted_proxy_hops=0,
        )
        == "10.0.0.20"
    )
    assert (
        resolve_client_address(
            "10.0.0.20",
            forwarded,
            trusted_proxy_hops=2,
        )
        == "198.51.100.8"
    )


def test_client_address_prefers_a_valid_real_ip() -> None:
    assert (
        resolve_client_address(
            "10.0.0.20",
            "203.0.113.20, 10.0.0.10",
            real_ip=" 2001:0db8::1 ",
            trusted_proxy_hops=2,
        )
        == "2001:db8::1"
    )


def test_client_address_ignores_an_invalid_real_ip_and_uses_proxy_fallback() -> None:
    assert (
        resolve_client_address(
            "10.0.0.20",
            "198.51.100.8, 10.0.0.10",
            real_ip="not-an-ip-address",
            trusted_proxy_hops=2,
        )
        == "198.51.100.8"
    )


def test_client_address_uses_peer_without_valid_proxy_headers() -> None:
    assert (
        resolve_client_address(
            "192.0.2.10",
            None,
            real_ip=None,
            trusted_proxy_hops=1,
        )
        == "192.0.2.10"
    )


def test_spoofed_forwarded_prefix_does_not_bypass_trusted_proxy_policy() -> None:
    forwarded = "203.0.113.66, 198.51.100.8"

    assert (
        resolve_client_address(
            "10.0.0.20",
            forwarded,
            real_ip=None,
            trusted_proxy_hops=1,
        )
        == "198.51.100.8"
    )
    assert (
        resolve_client_address(
            "10.0.0.20",
            forwarded,
            real_ip=None,
            trusted_proxy_hops=0,
        )
        == "10.0.0.20"
    )
