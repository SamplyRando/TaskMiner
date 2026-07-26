from dataclasses import dataclass
from typing import cast
from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from app.database.database import SessionLocal
from app.models.user import User


@dataclass(frozen=True)
class RegisteredUser:
    id: UUID
    email: str
    password: str
    full_name: str
    access_token: str

    @property
    def headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.access_token}"}


class UserFactory:
    def __init__(self, client: TestClient) -> None:
        self.client = client

    def build_payload(self) -> dict[str, str]:
        unique_id = uuid4().hex
        return {
            "email": f"user-{unique_id}@example.com",
            "password": "Strong-test-password-123!",
            "full_name": f"Test User {unique_id[:8]}",
        }

    def create(self) -> RegisteredUser:
        payload = self.build_payload()
        registration = self.client.post("/api/v1/auth/register", json=payload)
        assert registration.status_code == 201, registration.text

        login = self.client.post(
            "/api/v1/auth/login",
            json={
                "email": payload["email"],
                "password": payload["password"],
            },
        )
        assert login.status_code == 200, login.text

        registration_data = cast(dict[str, object], registration.json())
        login_data = cast(dict[str, object], login.json())
        return RegisteredUser(
            id=UUID(str(registration_data["id"])),
            email=payload["email"],
            password=payload["password"],
            full_name=payload["full_name"],
            access_token=str(login_data["access_token"]),
        )

    def set_active(self, user: RegisteredUser, *, is_active: bool) -> None:
        with SessionLocal() as session:
            database_user = session.get(User, user.id)
            assert database_user is not None
            database_user.is_active = is_active
            session.commit()

    def delete(self, user: RegisteredUser) -> None:
        with SessionLocal() as session:
            database_user = session.get(User, user.id)
            assert database_user is not None
            session.delete(database_user)
            session.commit()
