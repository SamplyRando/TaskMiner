from fastapi.testclient import TestClient

from tests.factories import RegisteredUser


def password_payload(user: RegisteredUser, new_password: str) -> dict[str, str]:
    return {
        "current_password": user.password,
        "new_password": new_password,
        "confirmation": new_password,
    }


def test_change_password_rotates_token_and_invalidates_previous_session(
    client: TestClient,
    user: RegisteredUser,
) -> None:
    new_password = "New-secure-password-456!"
    response = client.put(
        "/api/v1/users/me/password",
        headers=user.headers,
        json=password_payload(user, new_password),
    )

    assert response.status_code == 200
    new_headers = {"Authorization": f"Bearer {response.json()['access_token']}"}
    assert client.get("/api/v1/users/me", headers=user.headers).status_code == 401
    assert client.get("/api/v1/users/me", headers=new_headers).status_code == 200
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"email": user.email, "password": new_password},
        ).status_code
        == 200
    )


def test_change_password_rejects_wrong_current_password(
    client: TestClient,
    user: RegisteredUser,
) -> None:
    payload = password_payload(user, "New-secure-password-456!")
    payload["current_password"] = "wrong-password"

    response = client.put(
        "/api/v1/users/me/password",
        headers=user.headers,
        json=payload,
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Current password is incorrect."


def test_change_password_rejects_reuse(
    client: TestClient,
    user: RegisteredUser,
) -> None:
    response = client.put(
        "/api/v1/users/me/password",
        headers=user.headers,
        json=password_payload(user, user.password),
    )

    assert response.status_code == 409


def test_change_password_validates_strength_and_confirmation(
    client: TestClient,
    user: RegisteredUser,
) -> None:
    weak = client.put(
        "/api/v1/users/me/password",
        headers=user.headers,
        json=password_payload(user, "onlylowercase"),
    )
    mismatch_payload = password_payload(user, "New-secure-password-456!")
    mismatch_payload["confirmation"] = "Different-password-789!"
    mismatch = client.put(
        "/api/v1/users/me/password",
        headers=user.headers,
        json=mismatch_payload,
    )

    assert weak.status_code == 422
    assert mismatch.status_code == 422
