from uuid import uuid4

from fastapi.testclient import TestClient
import pytest

from tests.factories import (
    CreatedTask,
    RegisteredUser,
    UserFactory,
)


@pytest.mark.parametrize("method", ["PATCH", "DELETE"])
def test_missing_task_returns_404(
    client: TestClient,
    user: RegisteredUser,
    other_user: RegisteredUser,
    method: str,
) -> None:
    if method == "PATCH":
        response = client.patch(
            f"/api/v1/tasks/{uuid4()}/assign",
            headers=user.headers,
            json={"assigned_user_id": str(other_user.id)},
        )
    else:
        response = client.delete(
            f"/api/v1/tasks/{uuid4()}/assign",
            headers=user.headers,
        )

    assert response.status_code == 404
    assert response.json() == {"detail": "Task not found."}


@pytest.mark.parametrize("method", ["PATCH", "DELETE"])
def test_foreign_user_cannot_change_task_assignment(
    client: TestClient,
    task: CreatedTask,
    other_user: RegisteredUser,
    method: str,
) -> None:
    if method == "PATCH":
        response = client.patch(
            f"/api/v1/tasks/{task.id}/assign",
            headers=other_user.headers,
            json={"assigned_user_id": str(other_user.id)},
        )
    else:
        response = client.delete(
            f"/api/v1/tasks/{task.id}/assign",
            headers=other_user.headers,
        )

    assert response.status_code == 404
    assert response.json() == {"detail": "Task not found."}


def test_missing_assignee_returns_404(
    client: TestClient,
    task: CreatedTask,
) -> None:
    response = client.patch(
        f"/api/v1/tasks/{task.id}/assign",
        headers=task.project.owner.headers,
        json={"assigned_user_id": str(uuid4())},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "User not found."}


def test_inactive_assignee_returns_404(
    client: TestClient,
    task: CreatedTask,
    other_user: RegisteredUser,
    user_factory: UserFactory,
) -> None:
    user_factory.set_active(other_user, is_active=False)

    response = client.patch(
        f"/api/v1/tasks/{task.id}/assign",
        headers=task.project.owner.headers,
        json={"assigned_user_id": str(other_user.id)},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "User not found."}


def test_deleted_assignee_returns_404(
    client: TestClient,
    task: CreatedTask,
    other_user: RegisteredUser,
    user_factory: UserFactory,
) -> None:
    user_factory.delete(other_user)

    response = client.patch(
        f"/api/v1/tasks/{task.id}/assign",
        headers=task.project.owner.headers,
        json={"assigned_user_id": str(other_user.id)},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "User not found."}


@pytest.mark.parametrize("method", ["PATCH", "DELETE"])
def test_soft_deleted_task_cannot_be_assigned_or_unassigned(
    client: TestClient,
    task: CreatedTask,
    other_user: RegisteredUser,
    method: str,
) -> None:
    delete_response = client.delete(
        f"/api/v1/tasks/{task.id}",
        headers=task.project.owner.headers,
    )
    assert delete_response.status_code == 204

    if method == "PATCH":
        response = client.patch(
            f"/api/v1/tasks/{task.id}/assign",
            headers=task.project.owner.headers,
            json={"assigned_user_id": str(other_user.id)},
        )
    else:
        response = client.delete(
            f"/api/v1/tasks/{task.id}/assign",
            headers=task.project.owner.headers,
        )

    assert response.status_code == 404
    assert response.json() == {"detail": "Task not found."}


def test_soft_deleted_project_hides_task_assignment(
    client: TestClient,
    task: CreatedTask,
    other_user: RegisteredUser,
) -> None:
    delete_response = client.delete(
        f"/api/v1/projects/{task.project.id}",
        headers=task.project.owner.headers,
    )
    assert delete_response.status_code == 204

    response = client.patch(
        f"/api/v1/tasks/{task.id}/assign",
        headers=task.project.owner.headers,
        json={"assigned_user_id": str(other_user.id)},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Task not found."}


@pytest.mark.parametrize("account_state", ["inactive", "deleted"])
def test_unavailable_owner_cannot_change_task_assignment(
    client: TestClient,
    task: CreatedTask,
    other_user: RegisteredUser,
    user_factory: UserFactory,
    account_state: str,
) -> None:
    owner = task.project.owner
    if account_state == "inactive":
        user_factory.set_active(owner, is_active=False)
    else:
        user_factory.delete(owner)

    response = client.patch(
        f"/api/v1/tasks/{task.id}/assign",
        headers=owner.headers,
        json={"assigned_user_id": str(other_user.id)},
    )

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_missing_token_returns_401(
    client: TestClient,
    task: CreatedTask,
    other_user: RegisteredUser,
) -> None:
    response = client.patch(
        f"/api/v1/tasks/{task.id}/assign",
        json={"assigned_user_id": str(other_user.id)},
    )

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"
