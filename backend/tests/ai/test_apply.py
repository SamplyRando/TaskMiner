from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.ai_plan_application import AIPlanApplication
from app.models.audit_log import AuditLog
from app.models.project import Project
from app.models.task import Task
from app.models.workspace_member import WorkspaceMemberRole
from app.repositories.task import TaskRepository
from tests.factories import (
    CreatedProject,
    CreatedWorkspace,
    ProjectFactory,
    RegisteredUser,
    UserFactory,
    WorkspaceFactory,
    WorkspaceMemberFactory,
)


def approved_task(
    source_order: int,
    *,
    title: str | None = None,
    assigned_user_id: UUID | None = None,
    depends_on: list[int] | None = None,
) -> dict[str, object]:
    return {
        "source_order": source_order,
        "title": title or f"Approved task {source_order}",
        "description": f"Reviewed description {source_order}",
        "priority": "high" if source_order == 1 else "medium",
        "status": "in_progress" if source_order == 1 else "todo",
        "due_date": f"2026-09-0{source_order}T09:00:00Z",
        "assigned_user_id": (
            str(assigned_user_id) if assigned_user_id is not None else None
        ),
        "milestone": "Launch",
        "depends_on": depends_on or [],
    }


def apply_payload(
    workspace_id: UUID,
    *,
    project_id: UUID | None = None,
    idempotency_key: UUID | None = None,
    tasks: list[dict[str, object]] | None = None,
    source_task_count: int | None = None,
) -> dict[str, object]:
    approved_tasks = tasks or [
        approved_task(1),
        approved_task(2, depends_on=[1]),
    ]
    return {
        "workspace_id": str(workspace_id),
        "project_id": str(project_id) if project_id is not None else None,
        "project": (
            None
            if project_id is not None
            else {
                "name": "AI launch project",
                "description": "Approved AI project description",
            }
        ),
        "tasks": approved_tasks,
        "source_task_count": source_task_count or len(approved_tasks),
        "idempotency_key": str(idempotency_key or uuid4()),
    }


def post_apply(
    client: TestClient,
    user: RegisteredUser,
    payload: dict[str, object],
):
    return client.post(
        "/api/v1/ai/project-plan/apply",
        headers=user.headers,
        json=payload,
    )


def generated_seven_task_payload(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> list[dict[str, object]]:
    generation = client.post(
        "/api/v1/ai/project-plan",
        headers=workspace.owner.headers,
        json={
            "workspace_id": str(workspace.id),
            "project_id": None,
            "prompt": (
                "Prepare the launch of our mobile application with documentation, "
                "QA, and a launch campaign."
            ),
            "target_date": "2026-09-01",
        },
    )
    assert generation.status_code == 200
    generated_tasks = generation.json()["tasks"]
    assert len(generated_tasks) == 7

    approved_tasks: list[dict[str, object]] = []
    for generated_task in generated_tasks[:6]:
        due_date = generated_task["suggested_due_date"]
        approved_tasks.append(
            {
                "source_order": generated_task["order"],
                "title": generated_task["title"],
                "description": generated_task["description"],
                "priority": generated_task["priority"],
                "status": generated_task["status"],
                "due_date": f"{due_date}T12:00:00Z" if due_date else None,
                "assigned_user_id": None,
                "milestone": generated_task["milestone"],
                "depends_on": generated_task["depends_on"],
            }
        )
    approved_tasks[0]["title"] = "TEST IA - Définir le périmètre"
    return approved_tasks


def test_apply_requires_authentication(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    response = client.post(
        "/api/v1/ai/project-plan/apply",
        json=apply_payload(workspace.id),
    )

    assert response.status_code == 401


def test_apply_creates_new_project_and_only_approved_tasks(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
) -> None:
    payload = apply_payload(
        workspace.id,
        tasks=[approved_task(1, title="Edited approved task")],
        source_task_count=2,
    )

    response = post_apply(client, workspace.owner, payload)

    assert response.status_code == 200
    data = response.json()
    assert data["created_project"] is True
    assert data["created_task_count"] == 1
    assert data["skipped_task_count"] == 1
    assert data["idempotent_replay"] is False
    project = database_session.get(Project, UUID(data["project_id"]))
    assert project is not None
    assert project.name == "AI launch project"
    tasks = list(
        database_session.scalars(
            select(Task).where(Task.project_id == project.id)
        ).all()
    )
    assert len(tasks) == 1
    assert tasks[0].title == "Edited approved task"
    assert tasks[0].description == "Reviewed description 1"
    assert tasks[0].priority.value == "high"
    assert tasks[0].status.value == "in_progress"
    assert tasks[0].due_date == datetime(2026, 9, 1, 9, tzinfo=timezone.utc)


def test_apply_adds_tasks_to_existing_project_without_recreating_it(
    client: TestClient,
    workspace: CreatedWorkspace,
    project: CreatedProject,
    database_session: Session,
) -> None:
    project_count = int(database_session.scalar(select(func.count(Project.id))) or 0)

    response = post_apply(
        client,
        workspace.owner,
        apply_payload(workspace.id, project_id=project.id),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["project_id"] == str(project.id)
    assert data["created_project"] is False
    assert data["created_task_count"] == 2
    assert int(database_session.scalar(select(func.count(Project.id))) or 0) == (
        project_count
    )


def test_apply_six_of_seven_generated_tasks_to_existing_project(
    client: TestClient,
    workspace: CreatedWorkspace,
    project_factory: ProjectFactory,
    database_session: Session,
) -> None:
    project = project_factory.create(
        workspace.owner,
        name="TEST AI APPLY",
        description="Existing project data must remain unchanged",
    )
    approved_tasks = generated_seven_task_payload(client, workspace)
    key = uuid4()
    payload = apply_payload(
        workspace.id,
        project_id=project.id,
        idempotency_key=key,
        tasks=approved_tasks,
        source_task_count=7,
    )

    first = post_apply(client, workspace.owner, payload)
    replay = post_apply(client, workspace.owner, payload)

    assert first.status_code == 200
    assert replay.status_code == 200
    data = first.json()
    assert data["project_id"] == str(project.id)
    assert data["created_project"] is False
    assert data["created_task_count"] == 6
    assert data["skipped_task_count"] == 1
    assert len(data["created_task_ids"]) == 6
    assert replay.json()["created_task_ids"] == data["created_task_ids"]
    assert replay.json()["idempotent_replay"] is True

    persisted_project = database_session.get(Project, project.id)
    assert persisted_project is not None
    assert persisted_project.name == "TEST AI APPLY"
    assert (
        persisted_project.description == "Existing project data must remain unchanged"
    )
    tasks = list(
        database_session.scalars(
            select(Task).where(Task.project_id == project.id).order_by(Task.created_at)
        ).all()
    )
    assert len(tasks) == 6
    assert {task.id for task in tasks} == {
        UUID(task_id) for task_id in data["created_task_ids"]
    }
    assert {task.title for task in tasks} == {
        "TEST IA - Définir le périmètre",
        "Finalize landing page",
        "Complete API documentation",
        "Run QA validation",
        "Prepare launch campaign",
        "Review launch readiness",
    }
    assert "Publish release" not in {task.title for task in tasks}

    activities = [
        item
        for item in database_session.scalars(
            select(Activity).where(Activity.workspace_id == workspace.id)
        ).all()
        if item.activity_metadata.get("source") == "taskminer_ai"
    ]
    audit_logs = [
        item
        for item in database_session.scalars(
            select(AuditLog).where(AuditLog.workspace_id == workspace.id)
        ).all()
        if item.audit_metadata.get("source") == "taskminer_ai"
    ]
    assert len(activities) == 6
    assert len(audit_logs) == 6
    assert {item.resource_id for item in activities} == {task.id for task in tasks}
    assert {item.resource_id for item in audit_logs} == {task.id for task in tasks}


def test_apply_six_of_seven_generated_tasks_to_new_edited_project(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
) -> None:
    approved_tasks = generated_seven_task_payload(client, workspace)
    payload = apply_payload(
        workspace.id,
        tasks=approved_tasks,
        source_task_count=7,
    )
    payload["project"] = {
        "name": "TEST AI APPLY - NEW",
        "description": "Edited AI draft project description",
    }

    response = post_apply(client, workspace.owner, payload)

    assert response.status_code == 200
    data = response.json()
    assert data["created_project"] is True
    assert data["created_task_count"] == 6
    assert data["skipped_task_count"] == 1
    assert len(data["created_task_ids"]) == 6
    project = database_session.get(Project, UUID(data["project_id"]))
    assert project is not None
    assert project.name == "TEST AI APPLY - NEW"
    assert project.description == "Edited AI draft project description"
    tasks = list(
        database_session.scalars(
            select(Task).where(Task.project_id == project.id)
        ).all()
    )
    assert len(tasks) == 6
    assert "TEST IA - Définir le périmètre" in {task.title for task in tasks}
    assert "Publish release" not in {task.title for task in tasks}


def test_member_can_apply_to_existing_project_but_cannot_create_project(
    client: TestClient,
    workspace: CreatedWorkspace,
    project: CreatedProject,
    other_user: RegisteredUser,
    workspace_member_factory: WorkspaceMemberFactory,
) -> None:
    workspace_member_factory.create(
        workspace,
        other_user,
        role=WorkspaceMemberRole.MEMBER,
    )

    existing = post_apply(
        client,
        other_user,
        apply_payload(workspace.id, project_id=project.id),
    )
    creating = post_apply(client, other_user, apply_payload(workspace.id))

    assert existing.status_code == 200
    assert creating.status_code == 403


def test_viewer_cannot_apply_plan(
    client: TestClient,
    workspace: CreatedWorkspace,
    project: CreatedProject,
    other_user: RegisteredUser,
    workspace_member_factory: WorkspaceMemberFactory,
) -> None:
    workspace_member_factory.create(
        workspace,
        other_user,
        role=WorkspaceMemberRole.VIEWER,
    )

    response = post_apply(
        client,
        other_user,
        apply_payload(workspace.id, project_id=project.id),
    )

    assert response.status_code == 403


def test_foreign_workspace_is_hidden(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
) -> None:
    response = post_apply(client, other_user, apply_payload(workspace.id))

    assert response.status_code == 404


def test_deleted_workspace_is_hidden(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    deleted = client.delete(
        f"/api/v1/workspaces/{workspace.id}",
        headers=workspace.owner.headers,
    )

    response = post_apply(client, workspace.owner, apply_payload(workspace.id))

    assert deleted.status_code == 204
    assert response.status_code == 404


def test_wrong_workspace_and_deleted_projects_are_hidden(
    client: TestClient,
    workspace: CreatedWorkspace,
    project: CreatedProject,
    workspace_factory: WorkspaceFactory,
) -> None:
    other_workspace = workspace_factory.create(workspace.owner)
    wrong_workspace = post_apply(
        client,
        workspace.owner,
        apply_payload(other_workspace.id, project_id=project.id),
    )
    deleted = client.delete(
        f"/api/v1/projects/{project.id}",
        headers=workspace.owner.headers,
    )
    deleted_project = post_apply(
        client,
        workspace.owner,
        apply_payload(workspace.id, project_id=project.id),
    )

    assert wrong_workspace.status_code == 404
    assert deleted.status_code == 204
    assert deleted_project.status_code == 404


def test_assignee_must_be_an_active_workspace_member(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    workspace_member_factory: WorkspaceMemberFactory,
    database_session: Session,
) -> None:
    task = approved_task(1, assigned_user_id=other_user.id)
    rejected = post_apply(
        client,
        workspace.owner,
        apply_payload(workspace.id, tasks=[task]),
    )
    assert rejected.status_code == 404

    workspace_member_factory.create(workspace, other_user)
    accepted = post_apply(
        client,
        workspace.owner,
        apply_payload(workspace.id, tasks=[task]),
    )
    assert accepted.status_code == 200
    assert accepted.json()["created_assignment_count"] == 1
    created_task = database_session.get(
        Task, UUID(accepted.json()["created_task_ids"][0])
    )
    assert created_task is not None
    assert created_task.assigned_user_id == other_user.id


def test_member_removed_between_generation_and_apply_is_rejected_atomically(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    user_factory: UserFactory,
    workspace_member_factory: WorkspaceMemberFactory,
    database_session: Session,
) -> None:
    workspace_member_factory.create(workspace, other_user)
    generation = client.post(
        "/api/v1/ai/project-plan",
        headers=workspace.owner.headers,
        json={
            "workspace_id": str(workspace.id),
            "project_id": None,
            "prompt": "Prepare a complete launch plan for the workspace team.",
            "target_date": "2026-09-01",
        },
    )
    assert generation.status_code == 200
    suggestion = next(
        task
        for task in generation.json()["tasks"]
        if task["suggested_assignee_id"] == str(other_user.id)
    )
    user_factory.set_active(other_user, is_active=False)
    payload = apply_payload(
        workspace.id,
        tasks=[
            approved_task(
                suggestion["order"],
                title=suggestion["title"],
                assigned_user_id=other_user.id,
            )
        ],
    )

    response = post_apply(client, workspace.owner, payload)

    assert response.status_code == 404
    assert response.json() == {"detail": "Assignee not found."}
    assert int(database_session.scalar(select(func.count(Project.id))) or 0) == 0
    assert int(database_session.scalar(select(func.count(Task.id))) or 0) == 0


@pytest.mark.parametrize("account_state", ["inactive", "deleted"])
def test_unavailable_workspace_member_cannot_be_assigned(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    user_factory: UserFactory,
    workspace_member_factory: WorkspaceMemberFactory,
    account_state: str,
) -> None:
    workspace_member_factory.create(workspace, other_user)
    if account_state == "inactive":
        user_factory.set_active(other_user, is_active=False)
    else:
        user_factory.delete(other_user)

    response = post_apply(
        client,
        workspace.owner,
        apply_payload(
            workspace.id,
            tasks=[approved_task(1, assigned_user_id=other_user.id)],
        ),
    )

    assert response.status_code == 404


def test_apply_records_activity_and_audit_with_ai_source(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
) -> None:
    response = post_apply(client, workspace.owner, apply_payload(workspace.id))
    assert response.status_code == 200

    activities = [
        item
        for item in database_session.scalars(
            select(Activity).where(Activity.workspace_id == workspace.id)
        ).all()
        if item.activity_metadata.get("source") == "taskminer_ai"
    ]
    audit_logs = [
        item
        for item in database_session.scalars(
            select(AuditLog).where(AuditLog.workspace_id == workspace.id)
        ).all()
        if item.audit_metadata.get("source") == "taskminer_ai"
    ]
    assert len(activities) == 3
    assert len(audit_logs) == 3
    assert all(
        item.activity_metadata.get("source") == "taskminer_ai" for item in activities
    )
    assert all(
        item.audit_metadata.get("source") == "taskminer_ai" for item in audit_logs
    )


def test_same_idempotency_key_replays_without_duplicates(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
) -> None:
    key = uuid4()
    payload = apply_payload(workspace.id, idempotency_key=key)

    first = post_apply(client, workspace.owner, payload)
    second = post_apply(client, workspace.owner, payload)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["project_id"] == second.json()["project_id"]
    assert first.json()["created_task_ids"] == second.json()["created_task_ids"]
    assert first.json()["idempotent_replay"] is False
    assert second.json()["idempotent_replay"] is True
    assert int(database_session.scalar(select(func.count(Project.id))) or 0) == 1
    assert int(database_session.scalar(select(func.count(Task.id))) or 0) == 2
    assert (
        int(database_session.scalar(select(func.count(AIPlanApplication.id))) or 0) == 1
    )


def test_idempotency_key_reuse_with_different_payload_is_rejected(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    key = uuid4()
    first_payload = apply_payload(workspace.id, idempotency_key=key)
    second_payload = apply_payload(
        workspace.id,
        idempotency_key=key,
        tasks=[approved_task(1, title="Different payload")],
    )

    first = post_apply(client, workspace.owner, first_payload)
    second = post_apply(client, workspace.owner, second_payload)

    assert first.status_code == 200
    assert second.status_code == 409


def test_partial_failure_rolls_back_project_tasks_and_idempotency(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    original_create = TaskRepository.create
    calls = 0

    def fail_second_create(
        repository: TaskRepository,
        *args: object,
        **kwargs: object,
    ) -> Task:
        nonlocal calls
        calls += 1
        if calls == 2:
            raise RuntimeError("injected task failure")
        return original_create(repository, *args, **kwargs)  # type: ignore[arg-type]

    monkeypatch.setattr(TaskRepository, "create", fail_second_create)

    with pytest.raises(RuntimeError, match="injected task failure"):
        post_apply(client, workspace.owner, apply_payload(workspace.id))

    assert int(database_session.scalar(select(func.count(Project.id))) or 0) == 0
    assert int(database_session.scalar(select(func.count(Task.id))) or 0) == 0
    assert (
        int(database_session.scalar(select(func.count(AIPlanApplication.id))) or 0) == 0
    )
    assert not [
        activity
        for activity in database_session.scalars(select(Activity)).all()
        if activity.activity_metadata.get("source") == "taskminer_ai"
    ]
    assert not [
        audit
        for audit in database_session.scalars(select(AuditLog)).all()
        if audit.audit_metadata.get("source") == "taskminer_ai"
    ]
