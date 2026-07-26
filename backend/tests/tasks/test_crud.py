from uuid import UUID

from fastapi.testclient import TestClient

from tests.factories import (
    CreatedProject,
    CreatedTask,
    ProjectFactory,
    RegisteredUser,
    TaskFactory,
)


def test_create_task_in_owned_project(
    client: TestClient,
    project: CreatedProject,
) -> None:
    response = client.post(
        f"/api/v1/projects/{project.id}/tasks",
        headers=project.owner.headers,
        json={
            "title": "New task",
            "description": "Task description",
            "status": "in_progress",
            "priority": "high",
            "due_date": "2030-01-02T10:00:00Z",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "New task"
    assert data["description"] == "Task description"
    assert data["status"] == "in_progress"
    assert data["priority"] == "high"
    assert data["due_date"] is not None
    assert UUID(data["project_id"]) == project.id


def test_list_only_tasks_from_requested_project(
    client: TestClient,
    user: RegisteredUser,
    project: CreatedProject,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
) -> None:
    first = task_factory.create(project, title="First project task")
    second = task_factory.create(project, title="Second project task")
    other_project = project_factory.create(user)
    task_factory.create(other_project, title="Other project task")

    response = client.get(
        f"/api/v1/projects/{project.id}/tasks",
        headers=user.headers,
    )

    assert response.status_code == 200
    task_ids = {UUID(task["id"]) for task in response.json()}
    assert task_ids == {first.id, second.id}
    assert all(UUID(task["project_id"]) == project.id for task in response.json())


def test_read_task(
    client: TestClient,
    task: CreatedTask,
) -> None:
    response = client.get(
        f"/api/v1/tasks/{task.id}",
        headers=task.project.owner.headers,
    )

    assert response.status_code == 200
    assert UUID(response.json()["id"]) == task.id


def test_update_task(
    client: TestClient,
    task: CreatedTask,
) -> None:
    response = client.patch(
        f"/api/v1/tasks/{task.id}",
        headers=task.project.owner.headers,
        json={
            "title": "Updated task",
            "description": None,
            "status": "done",
            "priority": "urgent",
            "due_date": None,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated task"
    assert data["description"] is None
    assert data["status"] == "done"
    assert data["priority"] == "urgent"
    assert data["due_date"] is None
    assert UUID(data["project_id"]) == task.project.id


def test_delete_task(
    client: TestClient,
    task: CreatedTask,
) -> None:
    response = client.delete(
        f"/api/v1/tasks/{task.id}",
        headers=task.project.owner.headers,
    )

    assert response.status_code == 204
    assert not response.content

    missing_response = client.get(
        f"/api/v1/tasks/{task.id}",
        headers=task.project.owner.headers,
    )
    assert missing_response.status_code == 404
