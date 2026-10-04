from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.audit_log import AuditLog
from app.models.task import Task
from app.models.workspace_member import WorkspaceMemberRole
from app.repositories.reminder import ReminderRepository
from tests.factories import (
    CreatedProject,
    RegisteredUser,
    TaskFactory,
    WorkspaceMemberFactory,
)


def project_statuses(client: TestClient, project: CreatedProject) -> list[dict]:
    response = client.get(
        f"/api/v1/projects/{project.id}",
        headers=project.owner.headers,
    )
    assert response.status_code == 200
    return response.json()["task_statuses"]


def test_existing_project_has_ordered_legacy_equivalent_workflow(
    client: TestClient,
    project: CreatedProject,
) -> None:
    assert project_statuses(client, project) == [
        {"key": "todo", "label": "À faire", "position": 0, "is_completed": False},
        {
            "key": "in_progress",
            "label": "En cours",
            "position": 1,
            "is_completed": False,
        },
        {"key": "done", "label": "Terminée", "position": 2, "is_completed": True},
    ]


def test_owner_can_add_rename_reorder_and_choose_completed_status(
    client: TestClient,
    project: CreatedProject,
    database_session: Session,
) -> None:
    created = client.post(
        f"/api/v1/projects/{project.id}/statuses",
        headers=project.owner.headers,
        json={"label": "En validation"},
    )
    assert created.status_code == 201
    key = created.json()["key"]

    renamed = client.patch(
        f"/api/v1/projects/{project.id}/statuses/{key}",
        headers=project.owner.headers,
        json={"label": "Validation client", "is_completed": True},
    )
    assert renamed.status_code == 200
    assert renamed.json()["label"] == "Validation client"
    assert renamed.json()["is_completed"] is True

    reordered = client.put(
        f"/api/v1/projects/{project.id}/statuses/reorder",
        headers=project.owner.headers,
        json={"keys": ["todo", key, "in_progress", "done"]},
    )
    assert reordered.status_code == 200
    assert [item["key"] for item in reordered.json()] == [
        "todo",
        key,
        "in_progress",
        "done",
    ]
    assert sum(item["is_completed"] for item in reordered.json()) == 1
    assert (
        next(item for item in reordered.json() if item["key"] == "done")["is_completed"]
        is False
    )
    workflow_activity = database_session.scalar(
        select(Activity)
        .where(
            Activity.resource_id == project.id,
            Activity.activity_metadata["source"].astext == "project_workflow",
        )
        .order_by(Activity.created_at.desc())
    )
    workflow_audit = database_session.scalar(
        select(AuditLog)
        .where(
            AuditLog.resource_id == project.id,
            AuditLog.audit_metadata["source"].astext == "project_workflow",
        )
        .order_by(AuditLog.created_at.desc())
    )
    assert workflow_activity is not None
    assert workflow_activity.activity_metadata["action"] == "statuses_reordered"
    assert workflow_audit is not None
    assert workflow_audit.audit_metadata["action"] == "statuses_reordered"


def test_used_status_requires_reassignment_before_deletion(
    client: TestClient,
    project: CreatedProject,
    task_factory: TaskFactory,
    database_session: Session,
) -> None:
    created = client.post(
        f"/api/v1/projects/{project.id}/statuses",
        headers=project.owner.headers,
        json={"label": "Bloquée"},
    )
    key = created.json()["key"]
    task = task_factory.create(project, status=key)

    blocked = client.delete(
        f"/api/v1/projects/{project.id}/statuses/{key}",
        headers=project.owner.headers,
    )
    assert blocked.status_code == 409

    deleted = client.delete(
        f"/api/v1/projects/{project.id}/statuses/{key}",
        headers=project.owner.headers,
        params={"replacement_status": "in_progress"},
    )
    assert deleted.status_code == 204
    database_session.expire_all()
    stored = database_session.get(Task, task.id)
    assert stored is not None
    assert stored.status == "in_progress"
    assert key not in {item["key"] for item in project_statuses(client, project)}


def test_soft_deleted_task_status_still_requires_safe_reassignment(
    client: TestClient,
    project: CreatedProject,
    task_factory: TaskFactory,
    database_session: Session,
) -> None:
    created = client.post(
        f"/api/v1/projects/{project.id}/statuses",
        headers=project.owner.headers,
        json={"label": "Archivée"},
    )
    key = created.json()["key"]
    task = task_factory.create(project, status=key)
    stored = database_session.get(Task, task.id)
    assert stored is not None
    stored.deleted_at = datetime.now(timezone.utc)
    database_session.commit()

    blocked = client.delete(
        f"/api/v1/projects/{project.id}/statuses/{key}",
        headers=project.owner.headers,
    )
    assert blocked.status_code == 409

    deleted = client.delete(
        f"/api/v1/projects/{project.id}/statuses/{key}",
        headers=project.owner.headers,
        params={"replacement_status": "in_progress"},
    )
    assert deleted.status_code == 204
    database_session.expire_all()
    restored = database_session.get(Task, task.id)
    assert restored is not None
    assert restored.status == "in_progress"


def test_task_rejects_status_from_another_project(
    client: TestClient,
    project: CreatedProject,
    project_factory,
) -> None:
    other = project_factory.create(project.owner)
    created = client.post(
        f"/api/v1/projects/{other.id}/statuses",
        headers=project.owner.headers,
        json={"label": "Statut privé"},
    )
    foreign_key = created.json()["key"]

    response = client.post(
        f"/api/v1/projects/{project.id}/tasks",
        headers=project.owner.headers,
        json={"title": "Invalid", "status": foreign_key, "priority": "medium"},
    )
    assert response.status_code == 422
    assert response.json()["detail"] == "Status does not belong to this project."


def test_viewer_cannot_change_project_workflow(
    client: TestClient,
    project: CreatedProject,
    other_user: RegisteredUser,
    workspace_member_factory: WorkspaceMemberFactory,
) -> None:
    workspace_member_factory.create_for_workspace_id(
        project.workspace_id,
        other_user,
        role=WorkspaceMemberRole.VIEWER,
    )

    response = client.post(
        f"/api/v1/projects/{project.id}/statuses",
        headers=other_user.headers,
        json={"label": "Interdit"},
    )
    assert response.status_code == 403


def test_custom_completed_status_drives_dashboard_and_reminders(
    client: TestClient,
    project: CreatedProject,
    task_factory: TaskFactory,
    database_session: Session,
) -> None:
    created = client.post(
        f"/api/v1/projects/{project.id}/statuses",
        headers=project.owner.headers,
        json={"label": "Livrée", "is_completed": True},
    )
    completed_key = created.json()["key"]
    task = task_factory.create(project, status=completed_key)
    stored = database_session.get(Task, task.id)
    assert stored is not None
    stored.assigned_user_id = project.owner.id
    stored.due_date = datetime.now(timezone.utc) + timedelta(days=1)
    database_session.commit()

    dashboard = client.get(
        "/api/v1/dashboard",
        headers=project.owner.headers,
        params={"workspace_id": project.workspace_id},
    )
    assert dashboard.status_code == 200
    assert dashboard.json()["kpis"]["completed"] == 1
    assert dashboard.json()["my_tasks"] == []
    assert (
        ReminderRepository(database_session).list_candidates(datetime.now(timezone.utc))
        == []
    )
