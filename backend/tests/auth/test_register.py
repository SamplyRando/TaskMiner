import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.core.config import settings
from app.models.user import User
from tests.factories import UserFactory


def test_register_valid_user(
    client: TestClient,
    user_factory: UserFactory,
    database_session: Session,
) -> None:
    payload = user_factory.build_payload()

    response = client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == payload["email"]
    assert data["full_name"] == payload["full_name"]
    assert data["is_active"] is True
    assert "password" not in data
    assert "hashed_password" not in data

    user = database_session.scalar(select(User).where(User.email == payload["email"]))
    assert user is not None
    assert user.hashed_password != payload["password"]
    assert verify_password(payload["password"], user.hashed_password)


def test_register_rejects_existing_email(
    client: TestClient,
    user_factory: UserFactory,
) -> None:
    user = user_factory.create()

    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": user.email,
            "password": user.password,
            "full_name": "Duplicate User",
        },
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "An account with this email already exists."}


def test_register_rejects_invalid_email(
    client: TestClient,
    user_factory: UserFactory,
) -> None:
    payload = user_factory.build_payload()
    payload["email"] = "invalid-email"

    response = client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 422


@pytest.mark.parametrize(
    "password",
    [
        "short",
        "alllowercase123!",
        "ALLUPPERCASE123!",
        "NoDigitsHere!",
        "NoSpecial1234",
        "x" * 129,
    ],
)
def test_register_rejects_invalid_password(
    client: TestClient,
    user_factory: UserFactory,
    password: str,
) -> None:
    payload = user_factory.build_payload()
    payload["password"] = password

    response = client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 422


def test_register_trims_name_and_forbids_extra_fields(
    client: TestClient,
    user_factory: UserFactory,
) -> None:
    payload = user_factory.build_payload()
    payload["full_name"] = "  Ada Lovelace  "

    response = client.post("/api/v1/auth/register", json=payload)
    injected = client.post(
        "/api/v1/auth/register",
        json={**user_factory.build_payload(), "is_active": True},
    )

    assert response.status_code == 201
    assert response.json()["full_name"] == "Ada Lovelace"
    assert injected.status_code == 422


def test_register_rate_limit_runs_before_repeated_argon2_work(
    client: TestClient,
    user_factory: UserFactory,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "auth_register_rate_limit_requests", 2)
    first_payload = user_factory.build_payload()
    second_payload = user_factory.build_payload()
    third_payload = user_factory.build_payload()

    first = client.post("/api/v1/auth/register", json=first_payload)
    second = client.post("/api/v1/auth/register", json=second_payload)
    blocked = client.post("/api/v1/auth/register", json=third_payload)

    assert first.status_code == 201
    assert second.status_code == 201
    assert blocked.status_code == 429
    assert blocked.json()["detail"]["code"] == "auth_rate_limit_exceeded"
    assert 1 <= int(blocked.headers["Retry-After"]) <= 3600
