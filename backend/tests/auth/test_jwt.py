from datetime import timedelta

from fastapi.testclient import TestClient

from app.core.security import create_access_token, decode_access_token
from tests.factories import RegisteredUser


def assert_unauthorized(response_status: int, detail: object) -> None:
    assert response_status == 401
    assert detail == {"detail": "Could not validate credentials."}


def test_valid_token_contains_required_claims(
    client: TestClient,
    user: RegisteredUser,
) -> None:
    payload = decode_access_token(user.access_token)

    assert payload["sub"] == str(user.id)
    assert "iat" in payload
    assert "exp" in payload

    response = client.get("/api/v1/projects", headers=user.headers)
    assert response.status_code == 200


def test_expired_token_is_rejected(
    client: TestClient,
    user: RegisteredUser,
) -> None:
    token = create_access_token(
        str(user.id),
        expires_delta=timedelta(seconds=-1),
    )

    response = client.get(
        "/api/v1/projects",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert_unauthorized(response.status_code, response.json())
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_invalid_token_is_rejected(client: TestClient) -> None:
    response = client.get(
        "/api/v1/projects",
        headers={"Authorization": "Bearer invalid-token"},
    )

    assert_unauthorized(response.status_code, response.json())


def test_tampered_token_is_rejected(
    client: TestClient,
    user: RegisteredUser,
) -> None:
    header, payload, signature = user.access_token.split(".")
    replacement = "A" if signature[0] != "A" else "B"
    tampered_token = ".".join((header, payload, f"{replacement}{signature[1:]}"))

    response = client.get(
        "/api/v1/projects",
        headers={"Authorization": f"Bearer {tampered_token}"},
    )

    assert_unauthorized(response.status_code, response.json())


def test_missing_token_is_rejected(client: TestClient) -> None:
    response = client.get("/api/v1/projects")

    assert_unauthorized(response.status_code, response.json())
    assert response.headers["WWW-Authenticate"] == "Bearer"
