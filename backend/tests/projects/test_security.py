from uuid import uuid4

from fastapi.testclient import TestClient
from httpx import Response
import pytest

from tests.factories import ProjectFactory, RegisteredUser, UserFactory


def request_project(
    client: TestClient,
    method: str,
    project_id: object,
    headers: dict[str, str],
) -> Response:
    if method == "PATCH":
        return client.patch(
            f"/api/v1/projects/{project_id}",
            headers=headers,
            json={"name": "Unauthorized update"},
        )
    return client.request(
        method,
        f"/api/v1/projects/{project_id}",
        headers=headers,
    )


@pytest.mark.parametrize("method", ["GET", "PATCH", "DELETE"])
def test_missing_project_returns_404(
    client: TestClient,
    user: RegisteredUser,
    method: str,
) -> None:
    response = request_project(client, method, uuid4(), user.headers)

    assert response.status_code == 404
    assert response.json() == {"detail": "Project not found."}


@pytest.mark.parametrize("method", ["GET", "PATCH", "DELETE"])
def test_foreign_project_is_hidden(
    client: TestClient,
    user: RegisteredUser,
    other_user: RegisteredUser,
    project_factory: ProjectFactory,
    method: str,
) -> None:
    foreign_project = project_factory.create(other_user)

    foreign_response = request_project(
        client,
        method,
        foreign_project.id,
        user.headers,
    )
    missing_response = request_project(
        client,
        method,
        uuid4(),
        user.headers,
    )

    assert foreign_response.status_code == 404
    assert foreign_response.json() == missing_response.json()

    owner_response = client.get(
        f"/api/v1/projects/{foreign_project.id}",
        headers=other_user.headers,
    )
    assert owner_response.status_code == 200


def test_deleted_user_cannot_access_projects(
    client: TestClient,
    user: RegisteredUser,
    user_factory: UserFactory,
) -> None:
    user_factory.delete(user)

    response = client.get("/api/v1/projects", headers=user.headers)

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_inactive_user_cannot_access_projects(
    client: TestClient,
    user: RegisteredUser,
    user_factory: UserFactory,
) -> None:
    user_factory.set_active(user, is_active=False)

    response = client.get("/api/v1/projects", headers=user.headers)

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_client_cannot_select_project_owner(
    client: TestClient,
    user: RegisteredUser,
    other_user: RegisteredUser,
) -> None:
    response = client.post(
        "/api/v1/projects",
        headers=user.headers,
        json={"name": "Injected owner", "owner_id": str(other_user.id)},
    )

    assert response.status_code == 422
