from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.database.database import SessionLocal
from app.models.task import Task

from tests.factories import (
    ProjectFactory,
    RegisteredUser,
    TaskFactory,
    UserFactory,
    WorkspaceFactory,
)


def test_dashboard_returns_owner_analytics(
    client: TestClient,
    user: RegisteredUser,
    workspace_factory: WorkspaceFactory,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
) -> None:
    workspace = workspace_factory.create(user, name="Analytics workspace")
    project = project_factory.create(user, name="Dashboard project")
    task_factory.create(project, title="Pending", status="todo", priority="low")
    task_factory.create(
        project,
        title="Ongoing",
        status="in_progress",
        priority="high",
    )
    completed = task_factory.create(
        project,
        title="Completed",
        status="done",
        priority="medium",
    )
    urgent = task_factory.create(
        project,
        title="Urgent",
        status="todo",
        priority="urgent",
    )
    assigned = client.patch(
        f"/api/v1/tasks/{urgent.id}/assign",
        headers=user.headers,
        json={"assigned_user_id": str(user.id)},
    )
    assert assigned.status_code == 200

    response = client.get("/api/v1/dashboard", headers=user.headers)

    assert response.status_code == 200
    data = response.json()
    assert {
        key: data["kpis"][key]
        for key in (
            "workspaces",
            "projects",
            "tasks",
            "completed",
            "in_progress",
            "pending",
            "urgent",
            "completion_rate",
        )
    } == {
        "workspaces": 1,
        "projects": 1,
        "tasks": 4,
        "completed": 1,
        "in_progress": 1,
        "pending": 2,
        "urgent": 1,
        "completion_rate": 25.0,
    }
    assert data["kpis"]["overdue"] == 0
    assert data["kpis"]["due_today"] == 0
    assert data["kpis"]["due_this_week"] == 0
    assert data["kpis"]["average_tasks_per_project"] == 4.0
    assert "variations" in data["kpis"]
    assert data["status_distribution"] == [
        {"status": "todo", "count": 2, "percentage": 50.0},
        {"status": "in_progress", "count": 1, "percentage": 25.0},
        {"status": "done", "count": 1, "percentage": 25.0},
    ]
    assert data["priority_distribution"] == [
        {"priority": "low", "count": 1},
        {"priority": "medium", "count": 1},
        {"priority": "high", "count": 1},
        {"priority": "urgent", "count": 1},
    ]
    assert data["recent_projects"][0] == {
        "id": str(project.id),
        "name": "Dashboard project",
        "workspace_id": str(workspace.id),
        "workspace_name": "Analytics workspace",
        "task_count": 4,
        "completed_task_count": 1,
        "progress": 25.0,
        "status": "active",
        "created_at": data["recent_projects"][0]["created_at"],
    }
    assert data["recent_tasks"][0]["title"] == "Urgent"
    assert data["my_tasks"][0]["id"] == str(urgent.id)
    assert data["my_tasks"][0]["assigned_user"] == user.full_name
    assert data["quick_stats"]["today"] == {
        "created": 4,
        "completed": 1,
        "completion_rate": 25.0,
    }
    assert data["task_creation_trend"][-1]["count"] == 4
    assert len(data["task_creation_trend"]) == 14
    assert len(data["trends"]["task_completions"]) == 30
    assert len(data["trends"]["backlog"]) == 30
    assert len(data["trends"]["workspace_creations"]) == 30
    assert data["project_distribution"][0]["count"] == 4
    assert data["assignee_distribution"]
    assert data["event_distribution"]
    assert data["filter_options"]["workspaces"][0]["id"] == str(workspace.id)
    assert data["recent_activities"]
    assert completed.title == "Completed"


def test_dashboard_ignores_soft_deleted_resources(
    client: TestClient,
    user: RegisteredUser,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
) -> None:
    project = project_factory.create(user)
    task = task_factory.create(project)
    deleted = client.delete(f"/api/v1/tasks/{task.id}", headers=user.headers)
    assert deleted.status_code == 204

    response = client.get("/api/v1/dashboard", headers=user.headers)

    assert response.status_code == 200
    assert response.json()["kpis"]["tasks"] == 0
    assert response.json()["recent_tasks"] == []


def test_dashboard_is_isolated_by_owner(
    client: TestClient,
    user: RegisteredUser,
    user_factory: UserFactory,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
) -> None:
    project_factory.create(user, name="Visible project")
    other_user = user_factory.create()
    other_project = project_factory.create(other_user, name="Foreign project")
    task_factory.create(other_project, title="Foreign task")

    response = client.get("/api/v1/dashboard", headers=user.headers)

    assert response.status_code == 200
    data = response.json()
    assert data["kpis"]["projects"] == 1
    assert data["kpis"]["tasks"] == 0
    assert [project["name"] for project in data["recent_projects"]] == [
        "Visible project"
    ]


def test_dashboard_requires_authentication(client: TestClient) -> None:
    response = client.get("/api/v1/dashboard")

    assert response.status_code == 401
    assert client.get("/api/v1/dashboard/projects").status_code == 401


def test_dashboard_filters_tasks_and_validates_period(
    client: TestClient,
    user: RegisteredUser,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
) -> None:
    project = project_factory.create(user)
    own_task = task_factory.create(project, title="Assigned")
    task_factory.create(project, title="Unassigned")
    assignment = client.patch(
        f"/api/v1/tasks/{own_task.id}/assign",
        headers=user.headers,
        json={"assigned_user_id": str(user.id)},
    )
    assert assignment.status_code == 200

    response = client.get(
        "/api/v1/dashboard",
        headers=user.headers,
        params={
            "project_id": str(project.id),
            "user_id": str(user.id),
            "period": "7d",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["kpis"]["tasks"] == 1
    assert data["recent_tasks"][0]["id"] == str(own_task.id)
    assert len(data["trends"]["task_creations"]) == 7

    invalid = client.get(
        "/api/v1/dashboard",
        headers=user.headers,
        params={"period": "365d"},
    )
    assert invalid.status_code == 422


def test_dashboard_calculates_due_metrics(
    client: TestClient,
    user: RegisteredUser,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
) -> None:
    project = project_factory.create(user)
    overdue = task_factory.create(project, title="Overdue")
    today = task_factory.create(project, title="Due today")
    now = datetime.now(timezone.utc)
    tomorrow_start = (now + timedelta(days=1)).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )
    with SessionLocal() as session:
        overdue_model = session.get(Task, overdue.id)
        today_model = session.get(Task, today.id)
        assert overdue_model is not None
        assert today_model is not None
        overdue_model.due_date = now - timedelta(days=1)
        today_model.due_date = now + (tomorrow_start - now) / 2
        session.commit()

    response = client.get("/api/v1/dashboard", headers=user.headers)

    assert response.status_code == 200
    kpis = response.json()["kpis"]
    assert kpis["overdue"] == 1
    assert kpis["due_today"] == 1
    assert kpis["due_this_week"] >= 1


def test_dashboard_workspace_filter_never_exposes_foreign_data(
    client: TestClient,
    user: RegisteredUser,
    user_factory: UserFactory,
    workspace_factory: WorkspaceFactory,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
) -> None:
    other_user = user_factory.create()
    foreign_workspace = workspace_factory.create(other_user)
    foreign_project = project_factory.create(other_user)
    task_factory.create(foreign_project)

    response = client.get(
        "/api/v1/dashboard",
        headers=user.headers,
        params={"workspace_id": str(foreign_workspace.id)},
    )

    assert response.status_code == 200
    assert response.json()["kpis"]["workspaces"] == 0
    assert response.json()["kpis"]["tasks"] == 0
    assert response.json()["recent_activities"] == []


def test_dashboard_activity_limit_is_validated(
    client: TestClient,
    user: RegisteredUser,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
) -> None:
    project = project_factory.create(user)
    task_factory.create(project)

    response = client.get(
        "/api/v1/dashboard",
        headers=user.headers,
        params={"activity_limit": 1},
    )
    assert response.status_code == 200
    assert len(response.json()["recent_activities"]) == 1

    invalid = client.get(
        "/api/v1/dashboard",
        headers=user.headers,
        params={"activity_limit": 21},
    )
    assert invalid.status_code == 422


def test_dashboard_projects_support_server_search_sort_and_pagination(
    client: TestClient,
    user: RegisteredUser,
    project_factory: ProjectFactory,
) -> None:
    for name in ("Zulu", "Echo", "Delta", "Charlie", "Bravo", "Alpha"):
        project_factory.create(user, name=name)

    response = client.get(
        "/api/v1/dashboard/projects",
        headers=user.headers,
        params={"limit": 2, "offset": 2, "sort": "name", "period": "7d"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 6
    assert data["offset"] == 2
    assert [project["name"] for project in data["items"]] == [
        "Charlie",
        "Delta",
    ]

    search = client.get(
        "/api/v1/dashboard/projects",
        headers=user.headers,
        params={"search": "zul", "sort": "-task_count"},
    )
    assert search.status_code == 200
    assert search.json()["total"] == 1
    assert search.json()["items"][0]["name"] == "Zulu"
