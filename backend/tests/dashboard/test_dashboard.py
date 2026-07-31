from fastapi.testclient import TestClient

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
    assert data["kpis"] == {
        "workspaces": 1,
        "projects": 1,
        "tasks": 4,
        "completed": 1,
        "in_progress": 1,
        "pending": 2,
        "urgent": 1,
        "completion_rate": 25.0,
    }
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
