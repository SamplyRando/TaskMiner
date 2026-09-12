from collections.abc import Generator
from datetime import datetime, timedelta, timezone
import logging
from typing import Literal
from urllib.parse import parse_qs, urlparse
from uuid import UUID

from fastapi.testclient import TestClient
from httpx import Response
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_email_provider
from app.core.config import settings
from app.email.provider import (
    EmailDeliveryResult,
    EmailMessage,
    EmailProviderError,
)
from app.main import app
from app.models.account_action_token import AccountActionToken
from app.models.user import User
from tests.factories import RegisteredUser, UserFactory


class CapturingEmailProvider:
    provider_name: Literal["resend"] = "resend"

    def __init__(self, *, fail: bool = False) -> None:
        self.fail = fail
        self.messages: list[EmailMessage] = []

    def send(self, message: EmailMessage) -> EmailDeliveryResult:
        self.messages.append(message)
        if self.fail:
            raise EmailProviderError("tests-only-provider-sensitive-error")
        return EmailDeliveryResult(delivered=True)


@pytest.fixture
def email_provider() -> Generator[CapturingEmailProvider, None, None]:
    provider = CapturingEmailProvider()
    app.dependency_overrides[get_email_provider] = lambda: provider
    yield provider
    app.dependency_overrides.pop(get_email_provider, None)


def extract_token(message: EmailMessage, path: str) -> str:
    url = next(
        part
        for part in message.text.split()
        if part.startswith(f"http://localhost:3000{path}?")
    )
    return parse_qs(urlparse(url).query)["token"][0]


def latest_token(
    database_session: Session,
    user_id: UUID | str,
    purpose: str,
) -> AccountActionToken:
    database_session.expire_all()
    token = database_session.scalar(
        select(AccountActionToken)
        .where(
            AccountActionToken.user_id == user_id,
            AccountActionToken.purpose == purpose,
        )
        .order_by(AccountActionToken.created_at.desc())
    )
    assert token is not None
    return token


def register_with_email(
    client: TestClient,
    user_factory: UserFactory,
) -> tuple[dict[str, str], dict[str, object]]:
    payload = user_factory.build_payload()
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text
    return payload, response.json()


def request_password_reset(
    client: TestClient,
    email: str,
    *,
    address: str = "198.51.100.30",
) -> Response:
    return client.post(
        "/api/v1/auth/password-reset/request",
        headers={"X-Real-IP": address},
        json={"email": email},
    )


def test_registration_creates_hashed_verification_token_and_sends_email(
    client: TestClient,
    user_factory: UserFactory,
    database_session: Session,
    email_provider: CapturingEmailProvider,
) -> None:
    payload, registration = register_with_email(client, user_factory)

    assert registration["email_verified_at"] is None
    assert len(email_provider.messages) == 1
    message = email_provider.messages[0]
    raw_token = extract_token(message, "/verify-email")
    token = latest_token(
        database_session,
        str(registration["id"]),
        "email_verification",
    )
    assert message.recipient == payload["email"]
    assert message.subject == "Vérifiez votre adresse e-mail TaskMiner"
    assert raw_token in message.html
    assert token.token_hash != raw_token
    assert raw_token not in token.token_hash
    assert token.consumed_at is None


def test_email_verification_is_successful_and_idempotent(
    client: TestClient,
    user_factory: UserFactory,
    database_session: Session,
    email_provider: CapturingEmailProvider,
) -> None:
    payload, registration = register_with_email(client, user_factory)
    raw_token = extract_token(email_provider.messages[0], "/verify-email")

    first = client.post(
        "/api/v1/auth/email-verification/confirm",
        json={"token": raw_token},
    )
    second = client.post(
        "/api/v1/auth/email-verification/confirm",
        json={"token": raw_token},
    )

    assert first.status_code == 200
    assert first.json()["already_completed"] is False
    assert second.status_code == 200
    assert second.json()["already_completed"] is True
    database_session.expire_all()
    user = database_session.get(User, registration["id"])
    assert user is not None
    assert user.email_verified_at is not None
    token = latest_token(database_session, user.id, "email_verification")
    assert token.consumed_at is not None
    login = client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    assert login.status_code == 200
    assert login.json()["access_token"]


def test_expired_email_verification_token_is_rejected(
    client: TestClient,
    user_factory: UserFactory,
    database_session: Session,
    email_provider: CapturingEmailProvider,
) -> None:
    _, registration = register_with_email(client, user_factory)
    raw_token = extract_token(email_provider.messages[0], "/verify-email")
    token = latest_token(
        database_session,
        str(registration["id"]),
        "email_verification",
    )
    token.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    database_session.commit()

    response = client.post(
        "/api/v1/auth/email-verification/confirm",
        json={"token": raw_token},
    )

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "email_verification_token_expired"


def test_invalid_email_verification_token_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/email-verification/confirm",
        json={"token": "x" * 48},
    )

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "email_verification_token_invalid"


def test_verification_resend_has_cooldown_and_skips_already_verified_account(
    client: TestClient,
    user_factory: UserFactory,
    database_session: Session,
    email_provider: CapturingEmailProvider,
) -> None:
    payload, registration = register_with_email(client, user_factory)

    cooldown = client.post(
        "/api/v1/auth/email-verification/request",
        headers={"X-Real-IP": "198.51.100.31"},
        json={"email": payload["email"].upper()},
    )
    assert cooldown.status_code == 202
    assert len(email_provider.messages) == 1

    original = latest_token(
        database_session,
        str(registration["id"]),
        "email_verification",
    )
    original.created_at = datetime.now(timezone.utc) - timedelta(minutes=2)
    database_session.commit()
    resent = client.post(
        "/api/v1/auth/email-verification/request",
        headers={"X-Real-IP": "198.51.100.32"},
        json={"email": payload["email"]},
    )
    assert resent.status_code == 202
    assert len(email_provider.messages) == 2

    raw_token = extract_token(email_provider.messages[-1], "/verify-email")
    verified = client.post(
        "/api/v1/auth/email-verification/confirm",
        json={"token": raw_token},
    )
    assert verified.status_code == 200
    after_verification = client.post(
        "/api/v1/auth/email-verification/request",
        headers={"X-Real-IP": "198.51.100.33"},
        json={"email": payload["email"]},
    )
    assert after_verification.status_code == 202
    assert len(email_provider.messages) == 2


def test_verification_request_does_not_reveal_account_existence(
    client: TestClient,
    user_factory: UserFactory,
    email_provider: CapturingEmailProvider,
) -> None:
    payload, _ = register_with_email(client, user_factory)
    email_provider.messages.clear()

    known = client.post(
        "/api/v1/auth/email-verification/request",
        headers={"X-Real-IP": "198.51.100.34"},
        json={"email": payload["email"]},
    )
    unknown = client.post(
        "/api/v1/auth/email-verification/request",
        headers={"X-Real-IP": "198.51.100.35"},
        json={"email": "unknown@example.com"},
    )

    assert known.status_code == unknown.status_code == 202
    assert known.json() == unknown.json()


def test_known_and_unknown_password_reset_requests_have_same_response(
    client: TestClient,
    user: RegisteredUser,
    email_provider: CapturingEmailProvider,
) -> None:
    email_provider.messages.clear()

    known = request_password_reset(client, user.email, address="198.51.100.40")
    unknown = request_password_reset(
        client,
        "unknown@example.com",
        address="198.51.100.41",
    )

    assert known.status_code == unknown.status_code == 202
    assert known.json() == unknown.json()
    assert len(email_provider.messages) == 1
    message = email_provider.messages[0]
    assert message.recipient == user.email
    assert message.subject == "Réinitialisez votre mot de passe TaskMiner"
    assert extract_token(message, "/reset-password")


def test_password_reset_resend_respects_cooldown(
    client: TestClient,
    user: RegisteredUser,
    database_session: Session,
    email_provider: CapturingEmailProvider,
) -> None:
    email_provider.messages.clear()

    first = request_password_reset(client, user.email, address="198.51.100.42")
    cooldown = request_password_reset(
        client,
        user.email.upper(),
        address="198.51.100.43",
    )

    assert first.status_code == cooldown.status_code == 202
    assert len(email_provider.messages) == 1

    token = latest_token(database_session, user.id, "password_reset")
    token.created_at = datetime.now(timezone.utc) - timedelta(minutes=2)
    database_session.commit()
    resent = request_password_reset(client, user.email, address="198.51.100.44")

    assert resent.status_code == 202
    assert len(email_provider.messages) == 2


def test_password_reset_changes_password_invalidates_jwt_and_is_single_use(
    client: TestClient,
    user: RegisteredUser,
    database_session: Session,
    email_provider: CapturingEmailProvider,
) -> None:
    email_provider.messages.clear()
    requested = request_password_reset(client, user.email)
    assert requested.status_code == 202
    raw_token = extract_token(email_provider.messages[0], "/reset-password")
    token = latest_token(database_session, user.id, "password_reset")
    assert token.token_hash != raw_token
    new_password = "Different-strong-password-456!"

    reset = client.post(
        "/api/v1/auth/password-reset/confirm",
        json={
            "token": raw_token,
            "new_password": new_password,
            "confirmation": new_password,
        },
    )

    assert reset.status_code == 200
    assert client.get("/api/v1/users/me", headers=user.headers).status_code == 401
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"email": user.email, "password": user.password},
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"email": user.email, "password": new_password},
        ).status_code
        == 200
    )
    reused = client.post(
        "/api/v1/auth/password-reset/confirm",
        json={
            "token": raw_token,
            "new_password": "Another-strong-password-789!",
            "confirmation": "Another-strong-password-789!",
        },
    )
    assert reused.status_code == 400
    assert reused.json()["detail"]["code"] == "password_reset_token_invalid"


def test_password_reset_rejects_current_password(
    client: TestClient,
    user: RegisteredUser,
    email_provider: CapturingEmailProvider,
) -> None:
    email_provider.messages.clear()
    request_password_reset(client, user.email)
    raw_token = extract_token(email_provider.messages[0], "/reset-password")

    response = client.post(
        "/api/v1/auth/password-reset/confirm",
        json={
            "token": raw_token,
            "new_password": user.password,
            "confirmation": user.password,
        },
    )

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "password_reset_password_reused"


def test_expired_and_invalid_password_reset_tokens_are_rejected(
    client: TestClient,
    user: RegisteredUser,
    database_session: Session,
    email_provider: CapturingEmailProvider,
) -> None:
    email_provider.messages.clear()
    request_password_reset(client, user.email)
    raw_token = extract_token(email_provider.messages[0], "/reset-password")
    token = latest_token(database_session, user.id, "password_reset")
    token.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    database_session.commit()

    expired = client.post(
        "/api/v1/auth/password-reset/confirm",
        json={
            "token": raw_token,
            "new_password": "Different-strong-password-456!",
            "confirmation": "Different-strong-password-456!",
        },
    )
    invalid = client.post(
        "/api/v1/auth/password-reset/confirm",
        json={
            "token": "z" * 48,
            "new_password": "Different-strong-password-456!",
            "confirmation": "Different-strong-password-456!",
        },
    )

    assert expired.status_code == 400
    assert expired.json()["detail"]["code"] == "password_reset_token_expired"
    assert invalid.status_code == 400
    assert invalid.json()["detail"]["code"] == "password_reset_token_invalid"


@pytest.mark.parametrize(
    "password",
    [
        "too-short",
        "alllowercase123!",
        "ALLUPPERCASE123!",
        "NoDigitsAllowed!",
        "NoSpecialCharacter123",
    ],
)
def test_password_reset_reuses_existing_password_policy(
    client: TestClient,
    password: str,
) -> None:
    response = client.post(
        "/api/v1/auth/password-reset/confirm",
        json={
            "token": "x" * 48,
            "new_password": password,
            "confirmation": password,
        },
    )

    assert response.status_code == 422


def test_password_reset_rate_limit_is_shared_and_returns_retry_after(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "auth_password_reset_rate_limit_requests", 1)
    first = request_password_reset(
        client,
        "first@example.com",
        address="198.51.100.50",
    )
    blocked = request_password_reset(
        client,
        "second@example.com",
        address="198.51.100.50",
    )

    assert first.status_code == 202
    assert blocked.status_code == 429
    assert blocked.json()["detail"]["code"] == "auth_rate_limit_exceeded"
    assert 1 <= int(blocked.headers["Retry-After"]) <= 3600


def test_email_delivery_failure_is_generic_and_does_not_log_token(
    client: TestClient,
    user_factory: UserFactory,
    caplog: pytest.LogCaptureFixture,
) -> None:
    provider = CapturingEmailProvider(fail=True)
    app.dependency_overrides[get_email_provider] = lambda: provider
    try:
        with caplog.at_level(logging.WARNING):
            payload, _ = register_with_email(client, user_factory)
    finally:
        app.dependency_overrides.pop(get_email_provider, None)

    assert provider.messages
    raw_token = extract_token(provider.messages[0], "/verify-email")
    assert raw_token not in caplog.text
    assert payload["email"] not in caplog.text
    assert "tests-only-provider-sensitive-error" not in caplog.text
