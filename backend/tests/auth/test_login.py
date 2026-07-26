from fastapi.testclient import TestClient

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
