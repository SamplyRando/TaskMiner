from fastapi.testclient import TestClient
import pytest

from app.core.config import settings

from tests.factories import RegisteredUser, UserFactory


def test_login_returns_bearer_token(
    client: TestClient,
    user: RegisteredUser,
) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": user.email.upper(), "password": user.password},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert isinstance(data["access_token"], str)
    assert data["access_token"]


def test_login_rejects_wrong_password(
    client: TestClient,
    user: RegisteredUser,
) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "Wrong-password-123!"},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid email or password."}
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_login_rejects_unknown_user(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "unknown-user@example.com",
            "password": "Strong-test-password-123!",
        },
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid email or password."}


def test_login_rejects_unverified_account_without_issuing_a_token(
    client: TestClient,
    user_factory: UserFactory,
) -> None:
    payload = user_factory.build_payload()
    registration = client.post("/api/v1/auth/register", json=payload)
    assert registration.status_code == 201

    response = client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": {
            "code": "email_not_verified",
            "message": "Please verify your email address before signing in.",
        }
    }
    assert "access_token" not in response.json()


def test_unverified_account_with_wrong_password_keeps_generic_auth_error(
    client: TestClient,
    user_factory: UserFactory,
) -> None:
    payload = user_factory.build_payload()
    registration = client.post("/api/v1/auth/register", json=payload)
    assert registration.status_code == 201

    response = client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": "Wrong-password-123!"},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid email or password."}


def test_login_rate_limit_uses_the_resolved_real_ip(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "auth_login_rate_limit_requests", 1)
    first = client.post(
        "/api/v1/auth/login",
        headers={"X-Real-IP": "198.51.100.10"},
        json={
            "email": "first-unknown@example.com",
            "password": "Strong-test-password-123!",
        },
    )
    different_address = client.post(
        "/api/v1/auth/login",
        headers={"X-Real-IP": "198.51.100.11"},
        json={
            "email": "second-unknown@example.com",
            "password": "Strong-test-password-123!",
        },
    )
    same_address = client.post(
        "/api/v1/auth/login",
        headers={"X-Real-IP": "198.51.100.10"},
        json={
            "email": "third-unknown@example.com",
            "password": "Strong-test-password-123!",
        },
    )

    assert first.status_code == 401
    assert different_address.status_code == 401
    assert same_address.status_code == 429


def test_login_rejects_inactive_user(
    client: TestClient,
    user: RegisteredUser,
    user_factory: UserFactory,
) -> None:
    user_factory.set_active(user, is_active=False)

    response = client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": user.password},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid email or password."}


def test_login_rate_limit_normalizes_identity_and_returns_retry_after(
    client: TestClient,
    user: RegisteredUser,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # The user factory performs one successful login before this assertion flow.
    monkeypatch.setattr(settings, "auth_login_rate_limit_requests", 3)
    monkeypatch.setattr(settings, "auth_login_rate_limit_window_seconds", 300)

    first = client.post(
        "/api/v1/auth/login",
        json={"email": user.email.upper(), "password": "Wrong-password-123!"},
    )
    second = client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "Wrong-password-123!"},
    )
    blocked = client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": user.password},
    )

    assert first.status_code == 401
    assert second.status_code == 401
    assert blocked.status_code == 429
    assert blocked.json()["detail"] == {
        "code": "auth_rate_limit_exceeded",
        "message": "Too many authentication attempts. Please try again later.",
    }
    assert 1 <= int(blocked.headers["Retry-After"]) <= 300


def test_login_rate_limit_response_does_not_reveal_account_existence(
    client: TestClient,
    user: RegisteredUser,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "auth_login_rate_limit_requests", 2)

    client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "Wrong-password-123!"},
    )
    known = client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "Wrong-password-123!"},
    )

    assert known.status_code == 429
    assert "email" not in str(known.json()).lower()
