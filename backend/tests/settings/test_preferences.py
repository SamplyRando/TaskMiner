from fastapi.testclient import TestClient

from tests.factories import RegisteredUser


def test_preferences_have_production_defaults(
    client: TestClient,
    user: RegisteredUser,
) -> None:
    response = client.get("/api/v1/users/me/preferences", headers=user.headers)

    assert response.status_code == 200
    assert response.json() == {
        "theme": "system",
        "motion": "full",
        "items_per_page": 20,
        "dashboard_period": 30,
        "accent": "violet",
        "notify_activity_feed": True,
        "notify_audit": True,
        "notify_invitations": True,
        "notify_comments": True,
        "notify_assignments": True,
    }


def test_preferences_are_partially_updated_and_persisted(
    client: TestClient,
    user: RegisteredUser,
) -> None:
    response = client.patch(
        "/api/v1/users/me/preferences",
        headers=user.headers,
        json={
            "theme": "dark",
            "motion": "reduced",
            "items_per_page": 50,
            "dashboard_period": 90,
            "accent": "green",
            "notify_comments": False,
        },
    )

    assert response.status_code == 200
    assert response.json()["theme"] == "dark"
    assert response.json()["notify_comments"] is False
    persisted = client.get("/api/v1/users/me/preferences", headers=user.headers)
    assert persisted.json() == response.json()


def test_preferences_reject_invalid_and_server_fields(
    client: TestClient,
    user: RegisteredUser,
) -> None:
    invalid_limit = client.patch(
        "/api/v1/users/me/preferences",
        headers=user.headers,
        json={"items_per_page": 25},
    )
    extra = client.patch(
        "/api/v1/users/me/preferences",
        headers=user.headers,
        json={"user_id": str(user.id)},
    )

    assert invalid_limit.status_code == 422
    assert extra.status_code == 422
