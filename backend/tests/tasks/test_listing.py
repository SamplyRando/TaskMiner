from datetime import datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient
import pytest
from sqlalchemy.orm import Session

from app.models.task import Task
from tests.factories import (
    ProjectFactory,
    RegisteredUser,
    TaskFactory,
)


def test_task_list_requires_authentication(client: TestClient) -> None:
    response = client.get("/api/v1/tasks")

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_task_list_is_paginated_and_owner_scoped(
    client: TestClient,
    user: RegisteredUser,
    other_user: RegisteredUser,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
) -> None:
    project = project_factory.create(user)
    owned_tasks = [task_factory.create(project) for _ in range(3)]
    foreign_project = project_factory.create(other_user)
    task_factory.create(foreign_project)

    first_page = client.get(
        "/api/v1/tasks",
        headers=user.headers,
        params={"skip": 0, "limit": 2},
    )
    second_page = client.get(
        "/api/v1/tasks",
        headers=user.headers,
        params={"skip": 2, "limit": 2},
    )

    assert first_page.status_code == 200
    assert second_page.status_code == 200
    first_data = first_page.json()
    second_data = second_page.json()
    returned_ids = {item["id"] for item in first_data["items"] + second_data["items"]}
    assert returned_ids == {str(task.id) for task in owned_tasks}
    assert first_data["total"] == second_data["total"] == 3
    assert first_data["skip"] == 0
    assert second_data["skip"] == 2
    assert first_data["limit"] == second_data["limit"] == 2


def test_task_search_is_case_insensitive_across_fields(
    client: TestClient,
    user: RegisteredUser,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
) -> None:
    project = project_factory.create(user)
    title_match = task_factory.create(project, title="Dashboard frontend")
    description_match = task_factory.create(
        project,
        title="Metrics",
        description="Backend DASHBOARD metrics",
    )
    task_factory.create(project, title="Unrelated task")

    response = client.get(
        "/api/v1/tasks",
        headers=user.headers,
        params={"search": "dashboard"},
    )

    assert response.status_code == 200
    data = response.json()
    assert {item["id"] for item in data["items"]} == {
        str(title_match.id),
        str(description_match.id),
    }
    assert data["total"] == 2


def test_task_filters_status_priority_and_project(
    client: TestClient,
    user: RegisteredUser,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
) -> None:
    first_project = project_factory.create(user)
    second_project = project_factory.create(user)
    todo_high = task_factory.create(
        first_project,
        title="Todo high",
        status="todo",
        priority="high",
    )
    done_high = task_factory.create(
        first_project,
        title="Done high",
        status="done",
        priority="high",
    )
    todo_low = task_factory.create(
        second_project,
        title="Todo low",
        status="todo",
        priority="low",
    )

    status_response = client.get(
        "/api/v1/tasks",
        headers=user.headers,
        params={"status": "todo"},
    )
    priority_response = client.get(
        "/api/v1/tasks",
        headers=user.headers,
        params={"priority": "high"},
    )
    project_response = client.get(
        "/api/v1/tasks",
        headers=user.headers,
        params={"project_id": str(first_project.id)},
    )

    assert {item["id"] for item in status_response.json()["items"]} == {
        str(todo_high.id),
        str(todo_low.id),
    }
    assert {item["id"] for item in priority_response.json()["items"]} == {
        str(todo_high.id),
        str(done_high.id),
    }
    assert {item["id"] for item in project_response.json()["items"]} == {
        str(todo_high.id),
        str(done_high.id),
    }


def test_task_listing_combines_all_filters(
    client: TestClient,
    user: RegisteredUser,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
) -> None:
    project = project_factory.create(user)
    matching = task_factory.create(
        project,
        title="Dashboard matching",
        description="Release dashboard",
        status="todo",
        priority="high",
    )
    task_factory.create(
        project,
        title="Dashboard done",
        status="done",
        priority="high",
    )
    task_factory.create(
        project,
        title="Dashboard low",
        status="todo",
        priority="low",
    )

    response = client.get(
        "/api/v1/tasks",
        headers=user.headers,
        params={
            "search": "dashboard",
            "status": "todo",
            "priority": "high",
            "project_id": str(project.id),
            "sort": "title",
            "skip": 0,
            "limit": 10,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert [item["id"] for item in data["items"]] == [str(matching.id)]
    assert data["total"] == 1


def test_task_sort_supports_allowed_fields_and_directions(
    client: TestClient,
    user: RegisteredUser,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
    database_session: Session,
) -> None:
    project = project_factory.create(user)
    alpha = task_factory.create(project, title="Alpha")
    bravo = task_factory.create(project, title="Bravo")

    alpha_model = database_session.get(Task, alpha.id)
    bravo_model = database_session.get(Task, bravo.id)
    assert alpha_model is not None
    assert bravo_model is not None
    alpha_model.created_at = datetime(2025, 1, 1, tzinfo=timezone.utc)
    alpha_model.updated_at = datetime(2025, 2, 1, tzinfo=timezone.utc)
    bravo_model.created_at = datetime(2025, 1, 2, tzinfo=timezone.utc)
    bravo_model.updated_at = datetime(2025, 1, 1, tzinfo=timezone.utc)
    database_session.commit()

    expectations = {
        "title": [str(alpha.id), str(bravo.id)],
        "-title": [str(bravo.id), str(alpha.id)],
        "created_at": [str(alpha.id), str(bravo.id)],
        "-created_at": [str(bravo.id), str(alpha.id)],
        "updated_at": [str(bravo.id), str(alpha.id)],
        "-updated_at": [str(alpha.id), str(bravo.id)],
    }
    for sort, expected_ids in expectations.items():
        response = client.get(
            "/api/v1/tasks",
            headers=user.headers,
            params={"sort": sort},
        )
        assert response.status_code == 200
        assert [item["id"] for item in response.json()["items"]] == expected_ids


def test_foreign_project_filter_does_not_reveal_project(
    client: TestClient,
    user: RegisteredUser,
    other_user: RegisteredUser,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
) -> None:
    foreign_project = project_factory.create(other_user)
    task_factory.create(foreign_project)

    foreign_response = client.get(
        "/api/v1/tasks",
        headers=user.headers,
        params={"project_id": str(foreign_project.id)},
    )
    missing_response = client.get(
        "/api/v1/tasks",
        headers=user.headers,
        params={"project_id": str(uuid4())},
    )

    assert foreign_response.status_code == 200
    assert foreign_response.json() == missing_response.json()
    assert foreign_response.json()["items"] == []
    assert foreign_response.json()["total"] == 0


@pytest.mark.parametrize(
    "params",
    [
        {"skip": -1},
        {"limit": 0},
        {"limit": 101},
        {"sort": "priority"},
        {"sort": "-unknown"},
        {"search": ""},
        {"status": "invalid"},
        {"priority": "invalid"},
        {"project_id": "invalid-uuid"},
        {"offset": 0},
    ],
)
def test_task_list_rejects_invalid_parameters(
    client: TestClient,
    user: RegisteredUser,
    params: dict[str, object],
) -> None:
    response = client.get(
        "/api/v1/tasks",
        headers=user.headers,
        params=params,
    )

    assert response.status_code == 422
