from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.ai_plan_application import AIPlanApplication
from app.models.audit_log import AuditLog
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.workspace_member import WorkspaceMemberRole
from app.repositories.task import TaskRepository
from tests.factories import (
    CreatedProject,
    CreatedTask,
    CreatedWorkspace,
    ProjectFactory,
    RegisteredUser,
    TaskFactory,
    WorkspaceFactory,
    WorkspaceMemberFactory,
)


INSTRUCTION = (
    "Décale toutes les tâches API d'une semaine, mets-les en priorité haute "
    "et passe Préparer la documentation en cours."
)


def create_project(
    workspace: CreatedWorkspace,
    project_factory: ProjectFactory,
) -> CreatedProject:
    return project_factory.create(workspace.owner, name="TEST AI SPRINT 3")


def create_task(
    client: TestClient,
    task_factory: TaskFactory,
    project: CreatedProject,
    *,
    title: str,
    status: str = "todo",
    priority: str = "medium",
    due_date: str,
) -> CreatedTask:
    task = task_factory.create(
        project,
        title=title,
        status=status,
        priority=priority,
    )
    response = client.patch(
        f"/api/v1/tasks/{task.id}",
        headers=project.owner.headers,
        json={"due_date": due_date},
    )
    assert response.status_code == 200
    return task


def create_manual_scenario(
    client: TestClient,
    workspace: CreatedWorkspace,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
) -> tuple[CreatedProject, list[CreatedTask]]:
    project = create_project(workspace, project_factory)
    tasks = [
        create_task(
            client,
            task_factory,
            project,
            title="API authentication",
            due_date="2026-09-20T12:00:00Z",
        ),
        create_task(
            client,
            task_factory,
            project,
            title="API payments",
            status="in_progress",
            due_date="2026-09-22T12:00:00Z",
        ),
        create_task(
            client,
            task_factory,
            project,
            title="Préparer la documentation",
            priority="low",
            due_date="2026-09-25T12:00:00Z",
        ),
        create_task(
            client,
            task_factory,
            project,
            title="Launch production",
            priority="high",
            due_date="2026-09-30T12:00:00Z",
        ),
    ]
    return project, tasks


def generate_change_plan(
    client: TestClient,
    workspace: CreatedWorkspace,
    project: CreatedProject,
    *,
    instruction: str = INSTRUCTION,
):
    return client.post(
        "/api/v1/ai/project-change-plan",
        headers=workspace.owner.headers,
        json={
            "workspace_id": str(workspace.id),
            "project_id": str(project.id),
            "instruction": instruction,
        },
    )


def apply_payload(
    workspace: CreatedWorkspace,
    project: CreatedProject,
    changes: list[dict[str, object]],
    *,
    source_change_count: int | None = None,
    idempotency_key: UUID | None = None,
) -> dict[str, object]:
    return {
        "workspace_id": str(workspace.id),
        "project_id": str(project.id),
        "source_change_count": source_change_count or len(changes),
        "changes": [
            {
                "change_id": change["change_id"],
                "task_id": change["task_id"],
                "before": change["before"],
                "after": change["after"],
                "changed_fields": change["changed_fields"],
            }
            for change in changes
        ],
        "idempotency_key": str(idempotency_key or uuid4()),
    }


def post_apply(
    client: TestClient,
    user: RegisteredUser,
    payload: dict[str, object],
):
    return client.post(
        "/api/v1/ai/project-change-plan/apply",
        headers=user.headers,
        json=payload,
    )


def test_change_generation_requires_authentication(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    response = client.post(
        "/api/v1/ai/project-change-plan",
        json={
            "workspace_id": str(workspace.id),
            "project_id": str(uuid4()),
            "instruction": INSTRUCTION,
        },
    )

    assert response.status_code == 401


def test_change_generation_hides_an_inaccessible_workspace(
    client: TestClient,
    workspace: CreatedWorkspace,
    project_factory: ProjectFactory,
    other_user: RegisteredUser,
) -> None:
    project = create_project(workspace, project_factory)

    response = client.post(
        "/api/v1/ai/project-change-plan",
        headers=other_user.headers,
        json={
            "workspace_id": str(workspace.id),
            "project_id": str(project.id),
            "instruction": INSTRUCTION,
        },
    )

    assert response.status_code == 404


def test_change_generation_uses_current_server_context_without_writes(
    client: TestClient,
    workspace: CreatedWorkspace,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
    database_session: Session,
) -> None:
    project, tasks = create_manual_scenario(
        client, workspace, project_factory, task_factory
    )
    database_session.expire_all()
    before = {
        task.id: database_session.get(Task, task.id).updated_at  # type: ignore[union-attr]
        for task in tasks
    }

    response = generate_change_plan(client, workspace, project)

    assert response.status_code == 200
    data = response.json()
    assert data["project_id"] == str(project.id)
    assert [change["task_title"] for change in data["changes"]] == [
        "Préparer la documentation",
        "API payments",
        "API authentication",
    ]
    assert len(data["changes"]) == 3
    database_session.expire_all()
    assert {
        task.id: database_session.get(Task, task.id).updated_at  # type: ignore[union-attr]
        for task in tasks
    } == before


def test_change_generation_hides_foreign_and_deleted_projects(
    client: TestClient,
    workspace: CreatedWorkspace,
    project_factory: ProjectFactory,
    workspace_factory: WorkspaceFactory,
) -> None:
    project = create_project(workspace, project_factory)
    other_workspace = workspace_factory.create(workspace.owner)
    wrong_workspace = client.post(
        "/api/v1/ai/project-change-plan",
        headers=workspace.owner.headers,
        json={
            "workspace_id": str(other_workspace.id),
            "project_id": str(project.id),
            "instruction": INSTRUCTION,
        },
    )
    deleted = client.delete(
        f"/api/v1/projects/{project.id}",
        headers=workspace.owner.headers,
    )
    deleted_response = generate_change_plan(client, workspace, project)

    assert wrong_workspace.status_code == 404
    assert deleted.status_code == 204
    assert deleted_response.status_code == 404


def test_apply_manual_scenario_updates_only_selected_tasks_atomically(
    client: TestClient,
    workspace: CreatedWorkspace,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
    database_session: Session,
) -> None:
    project, tasks = create_manual_scenario(
        client, workspace, project_factory, task_factory
    )
    generation = generate_change_plan(client, workspace, project)
    assert generation.status_code == 200
    proposed = generation.json()["changes"]
    selected = [change for change in proposed if change["task_title"] != "API payments"]
    key = uuid4()
    payload = apply_payload(
        workspace,
        project,
        selected,
        source_change_count=len(proposed),
        idempotency_key=key,
    )

    first = post_apply(client, workspace.owner, payload)
    replay = post_apply(client, workspace.owner, payload)

    assert first.status_code == 200
    assert replay.status_code == 200
    data = first.json()
    assert data["modified_task_count"] == 2
    assert data["changed_field_count"] == 3
    assert data["skipped_change_count"] == 1
    assert len(data["modified_task_ids"]) == 2
    assert replay.json()["modified_task_ids"] == data["modified_task_ids"]
    assert replay.json()["idempotent_replay"] is True

    database_session.expire_all()
    authentication = database_session.get(Task, tasks[0].id)
    payments = database_session.get(Task, tasks[1].id)
    documentation = database_session.get(Task, tasks[2].id)
    production = database_session.get(Task, tasks[3].id)
    assert authentication is not None
    assert payments is not None
    assert documentation is not None
    assert production is not None
    assert authentication.priority == TaskPriority.HIGH
    assert authentication.due_date == datetime(2026, 9, 27, 12, tzinfo=timezone.utc)
    assert payments.priority == TaskPriority.MEDIUM
    assert payments.due_date == datetime(2026, 9, 22, 12, tzinfo=timezone.utc)
    assert documentation.status == TaskStatus.IN_PROGRESS
    assert production.priority == TaskPriority.HIGH
    assert production.due_date == datetime(2026, 9, 30, 12, tzinfo=timezone.utc)

    activities = [
        event
        for event in database_session.scalars(select(Activity)).all()
        if event.activity_metadata.get("source") == "taskminer_ai"
    ]
    audit_logs = [
        event
        for event in database_session.scalars(select(AuditLog)).all()
        if event.audit_metadata.get("source") == "taskminer_ai"
    ]
    assert len(activities) == 2
    assert len(audit_logs) == 2
    assert {event.resource_id for event in activities} == {
        authentication.id,
        documentation.id,
    }
    assert {event.resource_id for event in audit_logs} == {
        authentication.id,
        documentation.id,
    }


def test_change_apply_requires_authentication_and_a_non_empty_strict_payload(
    client: TestClient,
    workspace: CreatedWorkspace,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
) -> None:
    project, _ = create_manual_scenario(
        client, workspace, project_factory, task_factory
    )
    change = generate_change_plan(client, workspace, project).json()["changes"][0]
    valid_payload = apply_payload(workspace, project, [change])

    unauthenticated = client.post(
        "/api/v1/ai/project-change-plan/apply",
        json=valid_payload,
    )
    empty_payload = {
        **valid_payload,
        "changes": [],
    }
    empty = post_apply(client, workspace.owner, empty_payload)
    extra = post_apply(
        client,
        workspace.owner,
        {**valid_payload, "actor_id": str(workspace.owner.id)},
    )

    assert unauthenticated.status_code == 401
    assert empty.status_code == 422
    assert extra.status_code == 422


def test_apply_uses_reviewed_after_values(
    client: TestClient,
    workspace: CreatedWorkspace,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
    database_session: Session,
) -> None:
    project, _ = create_manual_scenario(
        client, workspace, project_factory, task_factory
    )
    change = generate_change_plan(client, workspace, project).json()["changes"][0]
    change["after"]["title"] = "Documentation approuvée"
    change["changed_fields"].append("title")

    response = post_apply(
        client,
        workspace.owner,
        apply_payload(workspace, project, [change]),
    )

    assert response.status_code == 200
    database_session.expire_all()
    task = database_session.get(Task, UUID(response.json()["modified_task_ids"][0]))
    assert task is not None
    assert task.title == "Documentation approuvée"


def test_stale_task_returns_structured_conflict_without_overwrite(
    client: TestClient,
    workspace: CreatedWorkspace,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
) -> None:
    project, _ = create_manual_scenario(
        client, workspace, project_factory, task_factory
    )
    change = generate_change_plan(client, workspace, project).json()["changes"][0]
    changed = client.patch(
        f"/api/v1/tasks/{change['task_id']}",
        headers=workspace.owner.headers,
        json={"title": "Concurrent edit"},
    )

    response = post_apply(
        client,
        workspace.owner,
        apply_payload(workspace, project, [change]),
    )

    assert changed.status_code == 200
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "AI_CHANGE_CONFLICT"
    assert response.json()["detail"]["conflicts"][0]["task_id"] == change["task_id"]


def test_viewer_cannot_apply_project_changes(
    client: TestClient,
    workspace: CreatedWorkspace,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
    other_user: RegisteredUser,
    workspace_member_factory: WorkspaceMemberFactory,
) -> None:
    project, _ = create_manual_scenario(
        client, workspace, project_factory, task_factory
    )
    change = generate_change_plan(client, workspace, project).json()["changes"][0]
    workspace_member_factory.create(
        workspace,
        other_user,
        role=WorkspaceMemberRole.VIEWER,
    )

    response = post_apply(
        client,
        other_user,
        apply_payload(workspace, project, [change]),
    )

    assert response.status_code == 403


def test_change_apply_hides_wrong_workspace_and_deleted_project(
    client: TestClient,
    workspace: CreatedWorkspace,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
    workspace_factory: WorkspaceFactory,
) -> None:
    project, _ = create_manual_scenario(
        client, workspace, project_factory, task_factory
    )
    change = generate_change_plan(client, workspace, project).json()["changes"][0]
    payload = apply_payload(workspace, project, [change])
    other_workspace = workspace_factory.create(workspace.owner)

    wrong_workspace = post_apply(
        client,
        workspace.owner,
        {**payload, "workspace_id": str(other_workspace.id)},
    )
    deleted = client.delete(
        f"/api/v1/projects/{project.id}",
        headers=workspace.owner.headers,
    )
    deleted_project = post_apply(client, workspace.owner, payload)

    assert wrong_workspace.status_code == 404
    assert deleted.status_code == 204
    assert deleted_project.status_code == 404


def test_foreign_or_deleted_task_is_rejected(
    client: TestClient,
    workspace: CreatedWorkspace,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
) -> None:
    project, _ = create_manual_scenario(
        client, workspace, project_factory, task_factory
    )
    foreign_project = project_factory.create(workspace.owner, name="Foreign project")
    foreign_task = task_factory.create(foreign_project, title="Foreign API")
    change = generate_change_plan(client, workspace, project).json()["changes"][0]
    change["task_id"] = str(foreign_task.id)
    foreign = post_apply(
        client,
        workspace.owner,
        apply_payload(workspace, project, [change]),
    )
    deleted_task = task_factory.create(project, title="Deleted API")
    deleted = client.delete(
        f"/api/v1/tasks/{deleted_task.id}", headers=workspace.owner.headers
    )
    change["task_id"] = str(deleted_task.id)
    deleted_response = post_apply(
        client,
        workspace.owner,
        apply_payload(workspace, project, [change]),
    )

    assert foreign.status_code == 404
    assert deleted.status_code == 204
    assert deleted_response.status_code == 404


def test_idempotency_key_with_different_change_payload_conflicts(
    client: TestClient,
    workspace: CreatedWorkspace,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
) -> None:
    project, _ = create_manual_scenario(
        client, workspace, project_factory, task_factory
    )
    changes = generate_change_plan(client, workspace, project).json()["changes"]
    key = uuid4()
    first_payload = apply_payload(workspace, project, [changes[0]], idempotency_key=key)
    second_payload = apply_payload(
        workspace, project, [changes[1]], idempotency_key=key
    )

    first = post_apply(client, workspace.owner, first_payload)
    second = post_apply(client, workspace.owner, second_payload)

    assert first.status_code == 200
    assert second.status_code == 409


def test_multi_task_failure_rolls_back_all_updates_and_idempotency(
    client: TestClient,
    workspace: CreatedWorkspace,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
    database_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    project, tasks = create_manual_scenario(
        client, workspace, project_factory, task_factory
    )
    changes = generate_change_plan(client, workspace, project).json()["changes"]
    original_update = TaskRepository.update
    calls = 0

    def fail_second_update(
        repository: TaskRepository,
        *args: object,
        **kwargs: object,
    ) -> Task:
        nonlocal calls
        calls += 1
        if calls == 2:
            raise RuntimeError("injected task update failure")
        return original_update(repository, *args, **kwargs)  # type: ignore[arg-type]

    monkeypatch.setattr(TaskRepository, "update", fail_second_update)

    with pytest.raises(RuntimeError, match="injected task update failure"):
        post_apply(
            client,
            workspace.owner,
            apply_payload(workspace, project, changes),
        )

    database_session.expire_all()
    authentication = database_session.get(Task, tasks[0].id)
    payments = database_session.get(Task, tasks[1].id)
    documentation = database_session.get(Task, tasks[2].id)
    assert authentication is not None
    assert payments is not None
    assert documentation is not None
    assert authentication.priority == TaskPriority.MEDIUM
    assert payments.priority == TaskPriority.MEDIUM
    assert documentation.status == TaskStatus.TODO
    assert list(database_session.scalars(select(AIPlanApplication)).all()) == []
    assert not [
        event
        for event in database_session.scalars(select(Activity)).all()
        if event.activity_metadata.get("source") == "taskminer_ai"
    ]
