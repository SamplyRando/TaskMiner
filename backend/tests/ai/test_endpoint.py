from datetime import date
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.task import Task
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMemberRole
from tests.factories import (
    CreatedProject,
    CreatedWorkspace,
    ProjectFactory,
    RegisteredUser,
    WorkspaceFactory,
    WorkspaceMemberFactory,
)


def plan_payload(
    workspace_id: object,
    *,
    project_id: object | None = None,
    target_date: str | None = None,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "workspace_id": str(workspace_id),
        "project_id": str(project_id) if project_id is not None else None,
        "prompt": (
            "Prepare the launch of our mobile application with documentation, "
            "QA, and a launch campaign."
        ),
        "target_date": target_date,
    }
    return payload


def test_project_plan_requires_authentication(client: TestClient) -> None:
    response = client.post(
        "/api/v1/ai/project-plan",
        json=plan_payload(uuid4()),
    )

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_project_plan_returns_a_structured_transient_draft(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    response = client.post(
        "/api/v1/ai/project-plan",
        headers=workspace.owner.headers,
        json=plan_payload(workspace.id, target_date="2026-09-01"),
    )

    assert response.status_code == 200
    data = response.json()
    assert set(data) == {"summary", "tasks", "milestones", "warnings"}
    assert data["summary"].startswith("A structured launch plan")
    assert len(data["tasks"]) == 7
    assert len(data["milestones"]) == 3
    assert data["tasks"][0] == {
        "title": "Define launch scope",
        "description": (
            "Confirm the release objective, audience, constraints, and success "
            "criteria."
        ),
        "priority": "high",
        "status": "todo",
        "suggested_due_date": "2026-08-18",
        "milestone": "Planning",
        "order": 1,
        "depends_on": [],
    }
    assert data["warnings"] == []


def test_viewer_cannot_consume_ai_generation(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    workspace_member_factory: WorkspaceMemberFactory,
) -> None:
    workspace_member_factory.create(
        workspace,
        other_user,
        role=WorkspaceMemberRole.VIEWER,
    )

    response = client.post(
        "/api/v1/ai/project-plan",
        headers=other_user.headers,
        json=plan_payload(workspace.id),
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "Insufficient permissions."}


def test_foreign_workspace_is_hidden(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
) -> None:
    response = client.post(
        "/api/v1/ai/project-plan",
        headers=other_user.headers,
        json=plan_payload(workspace.id),
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Workspace not found."}


def test_deleted_workspace_is_hidden(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    deleted = client.delete(
        f"/api/v1/workspaces/{workspace.id}",
        headers=workspace.owner.headers,
    )
    assert deleted.status_code == 204

    response = client.post(
        "/api/v1/ai/project-plan",
        headers=workspace.owner.headers,
        json=plan_payload(workspace.id),
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Workspace not found."}


def test_valid_project_in_workspace_is_accepted(
    client: TestClient,
    workspace: CreatedWorkspace,
    project: CreatedProject,
) -> None:
    response = client.post(
        "/api/v1/ai/project-plan",
        headers=workspace.owner.headers,
        json=plan_payload(workspace.id, project_id=project.id),
    )

    assert response.status_code == 200


def test_unknown_project_is_hidden(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    response = client.post(
        "/api/v1/ai/project-plan",
        headers=workspace.owner.headers,
        json=plan_payload(workspace.id, project_id=uuid4()),
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Project not found."}


def test_project_from_another_workspace_is_hidden(
    client: TestClient,
    workspace: CreatedWorkspace,
    project: CreatedProject,
    workspace_factory: WorkspaceFactory,
) -> None:
    second_workspace = workspace_factory.create(workspace.owner)

    response = client.post(
        "/api/v1/ai/project-plan",
        headers=workspace.owner.headers,
        json=plan_payload(second_workspace.id, project_id=project.id),
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Project not found."}


def test_inaccessible_project_is_hidden(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    project_factory: ProjectFactory,
) -> None:
    foreign_project = project_factory.create(other_user)

    response = client.post(
        "/api/v1/ai/project-plan",
        headers=workspace.owner.headers,
        json=plan_payload(workspace.id, project_id=foreign_project.id),
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Project not found."}


def test_deleted_project_is_hidden(
    client: TestClient,
    workspace: CreatedWorkspace,
    project: CreatedProject,
) -> None:
    deleted = client.delete(
        f"/api/v1/projects/{project.id}",
        headers=workspace.owner.headers,
    )
    assert deleted.status_code == 204

    response = client.post(
        "/api/v1/ai/project-plan",
        headers=workspace.owner.headers,
        json=plan_payload(workspace.id, project_id=project.id),
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Project not found."}


def test_generation_does_not_create_or_mutate_resources(
    client: TestClient,
    workspace: CreatedWorkspace,
    project: CreatedProject,
    database_session: Session,
) -> None:
    database_workspace = database_session.get(Workspace, workspace.id)
    database_project = database_session.get(Project, project.id)
    assert database_workspace is not None
    assert database_project is not None
    workspace_snapshot = (
        database_workspace.name,
        database_workspace.description,
        database_workspace.updated_at,
    )
    project_snapshot = (
        database_project.name,
        database_project.description,
        database_project.updated_at,
    )
    task_count_before = int(database_session.scalar(select(func.count(Task.id))) or 0)

    response = client.post(
        "/api/v1/ai/project-plan",
        headers=workspace.owner.headers,
        json=plan_payload(
            workspace.id,
            project_id=project.id,
            target_date=date(2026, 9, 1).isoformat(),
        ),
    )

    database_session.expire_all()
    assert response.status_code == 200
    assert int(database_session.scalar(select(func.count(Task.id))) or 0) == (
        task_count_before
    )
    refreshed_workspace = database_session.get(Workspace, workspace.id)
    refreshed_project = database_session.get(Project, project.id)
    assert refreshed_workspace is not None
    assert refreshed_project is not None
    assert (
        refreshed_workspace.name,
        refreshed_workspace.description,
        refreshed_workspace.updated_at,
    ) == workspace_snapshot
    assert (
        refreshed_project.name,
        refreshed_project.description,
        refreshed_project.updated_at,
    ) == project_snapshot
