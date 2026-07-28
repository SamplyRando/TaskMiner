from uuid import uuid4

from fastapi.testclient import TestClient
import pytest

from tests.factories import CreatedProject, CreatedTask, RegisteredUser


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"assigned_user_id": None},
        {"assigned_user_id": "not-a-uuid"},
    ],
)
def test_assign_rejects_invalid_payload(
    client: TestClient,
    task: CreatedTask,
    payload: dict[str, object],
) -> None:
    response = client.patch(
        f"/api/v1/tasks/{task.id}/assign",
        headers=task.project.owner.headers,
        json=payload,
    )

    assert response.status_code == 422


@pytest.mark.parametrize("field", ["title", "project_id", "status", "owner_id"])
def test_assign_forbids_extra_fields(
    client: TestClient,
    task: CreatedTask,
    other_user: RegisteredUser,
    field: str,
) -> None:
    response = client.patch(
        f"/api/v1/tasks/{task.id}/assign",
        headers=task.project.owner.headers,
        json={
            "assigned_user_id": str(other_user.id),
            field: "injected",
        },
    )

    assert response.status_code == 422


def test_general_task_update_cannot_change_assignment(
    client: TestClient,
    task: CreatedTask,
    other_user: RegisteredUser,
) -> None:
    response = client.patch(
        f"/api/v1/tasks/{task.id}",
        headers=task.project.owner.headers,
        json={"assigned_user_id": str(other_user.id)},
    )

    assert response.status_code == 422


def test_task_creation_cannot_set_assignment(
    client: TestClient,
    project: CreatedProject,
    other_user: RegisteredUser,
) -> None:
    response = client.post(
        f"/api/v1/projects/{project.id}/tasks",
        headers=project.owner.headers,
        json={
            "title": "Injected assignment",
            "assigned_user_id": str(other_user.id),
        },
    )

    assert response.status_code == 422


@pytest.mark.parametrize("method", ["PATCH", "DELETE"])
def test_invalid_task_uuid_returns_422(
    client: TestClient,
    user: RegisteredUser,
    method: str,
) -> None:
    if method == "PATCH":
        response = client.patch(
            "/api/v1/tasks/not-a-uuid/assign",
            headers=user.headers,
            json={"assigned_user_id": str(uuid4())},
        )
    else:
        response = client.delete(
            "/api/v1/tasks/not-a-uuid/assign",
            headers=user.headers,
        )

    assert response.status_code == 422
