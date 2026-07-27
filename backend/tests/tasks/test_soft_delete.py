from datetime import timedelta
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.task import Task
from tests.factories import (
    CreatedProject,
    CreatedTask,
    TaskFactory,
)


def test_delete_task_preserves_row_with_utc_audit_timestamp(
    client: TestClient,
    task: CreatedTask,
    database_session: Session,
) -> None:
    task_before = database_session.get(Task, task.id)
    assert task_before is not None
    created_at = task_before.created_at
    updated_at = task_before.updated_at

    response = client.delete(
        f"/api/v1/tasks/{task.id}",
        headers=task.project.owner.headers,
    )

    assert response.status_code == 204
    database_session.expire_all()
    deleted_task = database_session.get(Task, task.id)
    assert deleted_task is not None
    assert deleted_task.deleted_at is not None
    assert deleted_task.deleted_at.utcoffset() == timedelta(0)
    assert deleted_task.created_at == created_at
    assert deleted_task.updated_at >= updated_at


def test_deleted_task_cannot_be_read_updated_or_deleted_again(
    client: TestClient,
    task: CreatedTask,
) -> None:
    delete_response = client.delete(
        f"/api/v1/tasks/{task.id}",
        headers=task.project.owner.headers,
    )
    assert delete_response.status_code == 204

    read_response = client.get(
        f"/api/v1/tasks/{task.id}",
        headers=task.project.owner.headers,
    )
    update_response = client.patch(
        f"/api/v1/tasks/{task.id}",
        headers=task.project.owner.headers,
        json={"title": "Forbidden update"},
    )
    second_delete_response = client.delete(
        f"/api/v1/tasks/{task.id}",
        headers=task.project.owner.headers,
    )

    for response in (read_response, update_response, second_delete_response):
        assert response.status_code == 404
        assert response.json() == {"detail": "Task not found."}


def test_task_listings_search_filters_pagination_and_total_ignore_deleted_tasks(
    client: TestClient,
    project: CreatedProject,
    task_factory: TaskFactory,
) -> None:
    active_match = task_factory.create(
        project,
        title="Soft-delete dashboard active",
        status="todo",
        priority="high",
    )
    deleted_match = task_factory.create(
        project,
        title="Soft-delete dashboard deleted",
        status="todo",
        priority="high",
    )
    active_other = task_factory.create(
        project,
        title="Unrelated active task",
        status="done",
        priority="low",
    )
    delete_response = client.delete(
        f"/api/v1/tasks/{deleted_match.id}",
        headers=project.owner.headers,
    )
    assert delete_response.status_code == 204

    nested_response = client.get(
        f"/api/v1/projects/{project.id}/tasks",
        headers=project.owner.headers,
    )
    page_response = client.get(
        "/api/v1/tasks",
        headers=project.owner.headers,
        params={"skip": 0, "limit": 2},
    )
    filtered_response = client.get(
        "/api/v1/tasks",
        headers=project.owner.headers,
        params={
            "search": "SOFT-DELETE",
            "status": "todo",
            "priority": "high",
            "project_id": str(project.id),
        },
    )

    assert nested_response.status_code == 200
    assert {item["id"] for item in nested_response.json()} == {
        str(active_match.id),
        str(active_other.id),
    }

    assert page_response.status_code == 200
    page_data = page_response.json()
    assert {item["id"] for item in page_data["items"]} == {
        str(active_match.id),
        str(active_other.id),
    }
    assert page_data["total"] == 2
    assert len(page_data["items"]) == 2

    assert filtered_response.status_code == 200
    filtered_data = filtered_response.json()
    assert [item["id"] for item in filtered_data["items"]] == [str(active_match.id)]
    assert filtered_data["total"] == 1


def test_deleted_task_and_missing_task_are_indistinguishable(
    client: TestClient,
    task: CreatedTask,
) -> None:
    delete_response = client.delete(
        f"/api/v1/tasks/{task.id}",
        headers=task.project.owner.headers,
    )
    assert delete_response.status_code == 204

    deleted_response = client.get(
        f"/api/v1/tasks/{task.id}",
        headers=task.project.owner.headers,
    )
    missing_response = client.get(
        f"/api/v1/tasks/{uuid4()}",
        headers=task.project.owner.headers,
    )

    assert deleted_response.status_code == 404
    assert deleted_response.json() == missing_response.json()


def test_deleting_task_does_not_delete_its_project(
    client: TestClient,
    task: CreatedTask,
) -> None:
    delete_response = client.delete(
        f"/api/v1/tasks/{task.id}",
        headers=task.project.owner.headers,
    )
    assert delete_response.status_code == 204

    project_response = client.get(
        f"/api/v1/projects/{task.project.id}",
        headers=task.project.owner.headers,
    )

    assert project_response.status_code == 200
