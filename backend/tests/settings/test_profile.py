from fastapi.testclient import TestClient

from tests.factories import RegisteredUser


def test_get_profile_returns_account_metadata(
    client: TestClient,
    user: RegisteredUser,
) -> None:
    response = client.get("/api/v1/users/me", headers=user.headers)

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == str(user.id)
    assert payload["email"] == user.email
    assert payload["full_name"] == user.full_name
    assert payload["last_login_at"] is not None
    assert payload["primary_role"] is None


def test_profile_exposes_primary_workspace_role(
    client: TestClient,
    user: RegisteredUser,
) -> None:
    workspace = client.post(
        "/api/v1/workspaces",
        headers=user.headers,
        json={"name": "Profile workspace", "description": None},
    )
    assert workspace.status_code == 201

    response = client.get("/api/v1/users/me", headers=user.headers)

    assert response.status_code == 200
    assert response.json()["primary_role"] == "owner"


def test_update_profile_trims_name_and_keeps_email_immutable(
    client: TestClient,
    user: RegisteredUser,
) -> None:
    response = client.patch(
        "/api/v1/users/me",
        headers=user.headers,
        json={
            "full_name": "  Alice   Martin  ",
            "avatar_url": "https://cdn.example.com/alice.png",
        },
    )

    assert response.status_code == 200
    assert response.json()["full_name"] == "Alice Martin"
    assert response.json()["avatar_url"] == "https://cdn.example.com/alice.png"
    assert response.json()["email"] == user.email

    immutable = client.patch(
        "/api/v1/users/me",
        headers=user.headers,
        json={"full_name": "Alice Martin", "email": "other@example.com"},
    )
    assert immutable.status_code == 422


def test_update_profile_rejects_invalid_name_and_avatar(
    client: TestClient,
    user: RegisteredUser,
) -> None:
    invalid_name = client.patch(
        "/api/v1/users/me",
        headers=user.headers,
        json={"full_name": "Alice 123", "avatar_url": None},
    )
    invalid_avatar = client.patch(
        "/api/v1/users/me",
        headers=user.headers,
        json={"full_name": "Alice Martin", "avatar_url": "javascript:alert(1)"},
    )

    assert invalid_name.status_code == 422
    assert invalid_avatar.status_code == 422
