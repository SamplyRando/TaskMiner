from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.task import Task
from tests.factories import CreatedTask, RegisteredUser, UserFactory


def test_task_is_unassigned_by_default(
    client: TestClient,
    task: CreatedTask,
) -> None:
    response = client.get(
        f"/api/v1/tasks/{task.id}",
        headers=task.project.owner.headers,
    )

    assert response.status_code == 200
    assert response.json()["assigned_user_id"] is None


def test_assign_task_to_active_user(
    client: TestClient,
    task: CreatedTask,
    other_user: RegisteredUser,
    database_session: Session,
) -> None:
    response = client.patch(
        f"/api/v1/tasks/{task.id}/assign",
        headers=task.project.owner.headers,
        json={"assigned_user_id": str(other_user.id)},
    )

    assert response.status_code == 200
    assert response.json()["assigned_user_id"] == str(other_user.id)
    database_session.expire_all()
    stored_task = database_session.get(Task, task.id)
    assert stored_task is not None
    assert stored_task.assigned_user_id == other_user.id

    read_response = client.get(
        f"/api/v1/tasks/{task.id}",
        headers=task.project.owner.headers,
    )
    assert read_response.status_code == 200
    assert read_response.json()["assigned_user_id"] == str(other_user.id)


def test_reassign_task_to_another_active_user(
    client: TestClient,
    task: CreatedTask,
    other_user: RegisteredUser,
    user_factory: UserFactory,
) -> None:
    third_user = user_factory.create()
    first_response = client.patch(
        f"/api/v1/tasks/{task.id}/assign",
        headers=task.project.owner.headers,
        json={"assigned_user_id": str(other_user.id)},
    )
    assert first_response.status_code == 200

    second_response = client.patch(
        f"/api/v1/tasks/{task.id}/assign",
        headers=task.project.owner.headers,
        json={"assigned_user_id": str(third_user.id)},
    )

    assert second_response.status_code == 200
    assert second_response.json()["assigned_user_id"] == str(third_user.id)


def test_unassign_task(
    client: TestClient,
    task: CreatedTask,
    other_user: RegisteredUser,
    database_session: Session,
) -> None:
    assign_response = client.patch(
        f"/api/v1/tasks/{task.id}/assign",
        headers=task.project.owner.headers,
        json={"assigned_user_id": str(other_user.id)},
    )
    assert assign_response.status_code == 200

    response = client.delete(
        f"/api/v1/tasks/{task.id}/assign",
        headers=task.project.owner.headers,
    )

    assert response.status_code == 204
    assert response.content == b""
    database_session.expire_all()
    stored_task = database_session.get(Task, task.id)
    assert stored_task is not None
    assert stored_task.assigned_user_id is None


def test_unassign_already_unassigned_task_is_idempotent(
    client: TestClient,
    task: CreatedTask,
) -> None:
    response = client.delete(
        f"/api/v1/tasks/{task.id}/assign",
        headers=task.project.owner.headers,
    )

    assert response.status_code == 204


def test_deleting_assignee_sets_assignment_to_null(
    client: TestClient,
    task: CreatedTask,
    other_user: RegisteredUser,
    user_factory: UserFactory,
    database_session: Session,
) -> None:
    assign_response = client.patch(
        f"/api/v1/tasks/{task.id}/assign",
        headers=task.project.owner.headers,
        json={"assigned_user_id": str(other_user.id)},
    )
    assert assign_response.status_code == 200

    user_factory.delete(other_user)

    database_session.expire_all()
    stored_task = database_session.get(Task, task.id)
    assert stored_task is not None
    assert stored_task.assigned_user_id is None
    read_response = client.get(
        f"/api/v1/tasks/{task.id}",
        headers=task.project.owner.headers,
    )
    assert read_response.status_code == 200
    assert read_response.json()["assigned_user_id"] is None
