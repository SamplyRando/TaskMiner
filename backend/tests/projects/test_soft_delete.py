from datetime import timedelta
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.project import Project
from tests.factories import (
    CreatedProject,
    ProjectFactory,
    RegisteredUser,
    TaskFactory,
)


def test_delete_project_preserves_row_with_utc_audit_timestamp(
    client: TestClient,
    project: CreatedProject,
    database_session: Session,
) -> None:
    project_before = database_session.get(Project, project.id)
    assert project_before is not None
    created_at = project_before.created_at
    updated_at = project_before.updated_at

    response = client.delete(
        f"/api/v1/projects/{project.id}",
        headers=project.owner.headers,
    )

    assert response.status_code == 204
    database_session.expire_all()
    deleted_project = database_session.get(Project, project.id)
    assert deleted_project is not None
    assert deleted_project.deleted_at is not None
    assert deleted_project.deleted_at.utcoffset() == timedelta(0)
    assert deleted_project.created_at == created_at
    assert deleted_project.updated_at >= updated_at


def test_deleted_project_cannot_be_read_updated_or_deleted_again(
    client: TestClient,
    project: CreatedProject,
) -> None:
    delete_response = client.delete(
        f"/api/v1/projects/{project.id}",
        headers=project.owner.headers,
    )
    assert delete_response.status_code == 204

    read_response = client.get(
        f"/api/v1/projects/{project.id}",
        headers=project.owner.headers,
    )
    update_response = client.patch(
        f"/api/v1/projects/{project.id}",
        headers=project.owner.headers,
        json={"name": "Forbidden update"},
    )
    second_delete_response = client.delete(
        f"/api/v1/projects/{project.id}",
        headers=project.owner.headers,
    )

    for response in (read_response, update_response, second_delete_response):
        assert response.status_code == 404
        assert response.json() == {"detail": "Project not found."}


def test_project_list_pagination_search_and_total_ignore_deleted_projects(
    client: TestClient,
    user: RegisteredUser,
    project_factory: ProjectFactory,
) -> None:
    active_match = project_factory.create(user, name="Soft-delete dashboard active")
    deleted_match = project_factory.create(user, name="Soft-delete dashboard deleted")
    active_other = project_factory.create(user, name="Unrelated active project")
    delete_response = client.delete(
        f"/api/v1/projects/{deleted_match.id}",
        headers=user.headers,
    )
    assert delete_response.status_code == 204

    page_response = client.get(
        "/api/v1/projects",
        headers=user.headers,
        params={"skip": 0, "limit": 2},
    )
    search_response = client.get(
        "/api/v1/projects",
        headers=user.headers,
        params={"search": "SOFT-DELETE"},
    )

    assert page_response.status_code == 200
    page_data = page_response.json()
    assert {item["id"] for item in page_data["items"]} == {
        str(active_match.id),
        str(active_other.id),
    }
    assert page_data["total"] == 2
    assert len(page_data["items"]) == 2

    assert search_response.status_code == 200
    search_data = search_response.json()
    assert [item["id"] for item in search_data["items"]] == [str(active_match.id)]
    assert search_data["total"] == 1


def test_deleted_project_and_missing_project_are_indistinguishable(
    client: TestClient,
    project: CreatedProject,
) -> None:
    delete_response = client.delete(
        f"/api/v1/projects/{project.id}",
        headers=project.owner.headers,
    )
    assert delete_response.status_code == 204

    deleted_response = client.get(
        f"/api/v1/projects/{project.id}",
        headers=project.owner.headers,
    )
    missing_response = client.get(
        f"/api/v1/projects/{uuid4()}",
        headers=project.owner.headers,
    )

    assert deleted_response.status_code == 404
    assert deleted_response.json() == missing_response.json()


def test_deleting_project_hides_its_tasks_from_every_endpoint(
    client: TestClient,
    project: CreatedProject,
    task_factory: TaskFactory,
) -> None:
    task = task_factory.create(project)
    delete_response = client.delete(
        f"/api/v1/projects/{project.id}",
        headers=project.owner.headers,
    )
    assert delete_response.status_code == 204

    nested_response = client.get(
        f"/api/v1/projects/{project.id}/tasks",
        headers=project.owner.headers,
    )
    global_response = client.get(
        "/api/v1/tasks",
        headers=project.owner.headers,
    )
    task_response = client.get(
        f"/api/v1/tasks/{task.id}",
        headers=project.owner.headers,
    )

    assert nested_response.status_code == 404
    assert global_response.status_code == 200
    assert global_response.json()["items"] == []
    assert global_response.json()["total"] == 0
    assert task_response.status_code == 404
