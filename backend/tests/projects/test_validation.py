from fastapi.testclient import TestClient

from tests.factories import RegisteredUser


def test_project_name_cannot_be_only_whitespace(
    client: TestClient,
    user: RegisteredUser,
) -> None:
    response = client.post(
        "/api/v1/projects",
        headers=user.headers,
        json={"name": "   "},
    )

    assert response.status_code == 422


def test_project_description_has_a_production_size_limit(
    client: TestClient,
    user: RegisteredUser,
) -> None:
    response = client.post(
        "/api/v1/projects",
        headers=user.headers,
        json={"name": "Valid", "description": "x" * 5_001},
    )

    assert response.status_code == 422
