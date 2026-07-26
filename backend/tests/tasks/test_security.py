from uuid import uuid4

from fastapi.testclient import TestClient
from httpx import Response
import pytest

from tests.factories import (
    CreatedProject,
    ProjectFactory,
    RegisteredUser,
    TaskFactory,
    UserFactory,
)


def request_task(
    client: TestClient,
    method: str,
    task_id: object,
    headers: dict[str, str],
) -> Response:
    if method == "PATCH":
        return client.patch(
            f"/api/v1/tasks/{task_id}",
            headers=headers,
            json={"title": "Unauthorized update"},
        )
    return client.request(
        method,
        f"/api/v1/tasks/{task_id}",
        headers=headers,
    )


@pytest.mark.parametrize("method", ["GET", "PATCH", "DELETE"])
def test_missing_task_returns_404(
    client: TestClient,
    user: RegisteredUser,
    method: str,
) -> None:
    response = request_task(client, method, uuid4(), user.headers)

    assert response.status_code == 404
    assert response.json() == {"detail": "Task not found."}


@pytest.mark.parametrize("method", ["GET", "PATCH", "DELETE"])
def test_foreign_task_is_hidden(
    client: TestClient,
    user: RegisteredUser,
    other_user: RegisteredUser,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
    method: str,
) -> None:
    foreign_project = project_factory.create(other_user)
    foreign_task = task_factory.create(foreign_project)

    foreign_response = request_task(
        client,
        method,
        foreign_task.id,
        user.headers,
    )
    missing_response = request_task(
        client,
        method,
        uuid4(),
        user.headers,
    )

    assert foreign_response.status_code == 404
    assert foreign_response.json() == missing_response.json()

    owner_response = client.get(
        f"/api/v1/tasks/{foreign_task.id}",
        headers=other_user.headers,
    )
    assert owner_response.status_code == 200


@pytest.mark.parametrize("method", ["POST", "GET"])
def test_missing_project_for_tasks_returns_404(
    client: TestClient,
    user: RegisteredUser,
    method: str,
) -> None:
    url = f"/api/v1/projects/{uuid4()}/tasks"
    if method == "POST":
        response = client.post(
            url,
            headers=user.headers,
            json={"title": "Task for missing project"},
        )
    else:
        response = client.get(url, headers=user.headers)

    assert response.status_code == 404
    assert response.json() == {"detail": "Project not found."}


@pytest.mark.parametrize("method", ["POST", "GET"])
def test_foreign_project_for_tasks_is_hidden(
    client: TestClient,
    user: RegisteredUser,
    other_user: RegisteredUser,
    project_factory: ProjectFactory,
    method: str,
) -> None:
    foreign_project = project_factory.create(other_user)
    foreign_url = f"/api/v1/projects/{foreign_project.id}/tasks"
    missing_url = f"/api/v1/projects/{uuid4()}/tasks"

    if method == "POST":
        request_data = {"title": "Unauthorized task"}
        foreign_response = client.post(
            foreign_url,
            headers=user.headers,
            json=request_data,
        )
        missing_response = client.post(
            missing_url,
            headers=user.headers,
            json=request_data,
        )
    else:
        foreign_response = client.get(foreign_url, headers=user.headers)
        missing_response = client.get(missing_url, headers=user.headers)

    assert foreign_response.status_code == 404
    assert foreign_response.json() == missing_response.json()


def test_deleted_user_cannot_access_tasks(
    client: TestClient,
    user: RegisteredUser,
    project: CreatedProject,
    user_factory: UserFactory,
) -> None:
    user_factory.delete(user)

    response = client.get(
        f"/api/v1/projects/{project.id}/tasks",
        headers=user.headers,
    )

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_inactive_user_cannot_access_tasks(
    client: TestClient,
    user: RegisteredUser,
    project: CreatedProject,
    user_factory: UserFactory,
) -> None:
    user_factory.set_active(user, is_active=False)

    response = client.get(
        f"/api/v1/projects/{project.id}/tasks",
        headers=user.headers,
    )

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


@pytest.mark.parametrize(
    ("path_kind", "payload"),
    [
        ("create", {"title": "Injected project", "project_id": str(uuid4())}),
        ("update", {"project_id": str(uuid4())}),
        ("update", {"created_at": "2030-01-01T00:00:00Z"}),
        ("update", {"updated_at": "2030-01-01T00:00:00Z"}),
        ("update", {"owner_id": str(uuid4())}),
    ],
)
def test_client_cannot_set_protected_task_fields(
    client: TestClient,
    project: CreatedProject,
    task_factory: TaskFactory,
    path_kind: str,
    payload: dict[str, str],
) -> None:
    if path_kind == "create":
        response = client.post(
            f"/api/v1/projects/{project.id}/tasks",
            headers=project.owner.headers,
            json=payload,
        )
    else:
        task = task_factory.create(project)
        response = client.patch(
            f"/api/v1/tasks/{task.id}",
            headers=project.owner.headers,
            json=payload,
        )

    assert response.status_code == 422
