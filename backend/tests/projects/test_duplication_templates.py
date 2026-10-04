import json
from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.attachment import Attachment
from app.models.ai_usage_event import AIUsageEvent
from app.models.audit_log import AuditLog
from app.models.comment import Comment
from app.models.project import Project
from app.models.task import Task
from tests.factories import (
    AttachmentFactory,
    CommentFactory,
    CreatedProject,
    ProjectFactory,
    TaskFactory,
)


def test_duplicate_project_copies_workflow_and_tasks_without_private_relations(
    client: TestClient,
    project: CreatedProject,
    task_factory: TaskFactory,
    attachment_factory: AttachmentFactory,
    comment_factory: CommentFactory,
    database_session: Session,
) -> None:
    custom = client.post(
        f"/api/v1/projects/{project.id}/statuses",
        headers=project.owner.headers,
        json={"label": "Validation"},
    ).json()
    task = task_factory.create(project, status=custom["key"], priority="high")
    attachment_factory.create(task)
    comment_factory.create(task)
    source_task = database_session.get(Task, task.id)
    assert source_task is not None
    source_task.assigned_user_id = project.owner.id
    database_session.commit()

    response = client.post(
        f"/api/v1/projects/{project.id}/duplicate",
        headers=project.owner.headers,
    )

    assert response.status_code == 201
    duplicate = response.json()
    assert duplicate["id"] != str(project.id)
    assert duplicate["workspace_id"] == str(project.workspace_id)
    assert duplicate["name"].endswith("(copie)")
    assert [(item["key"], item["label"]) for item in duplicate["task_statuses"]] == [
        (item["key"], item["label"])
        for item in client.get(
            f"/api/v1/projects/{project.id}", headers=project.owner.headers
        ).json()["task_statuses"]
    ]
    copied_tasks = list(
        database_session.scalars(
            select(Task).where(Task.project_id == UUID(duplicate["id"]))
        ).all()
    )
    assert len(copied_tasks) == 1
    assert copied_tasks[0].id != task.id
    assert copied_tasks[0].status == custom["key"]
    assert copied_tasks[0].assigned_user_id is None
    assert (
        database_session.scalar(
            select(func.count(Comment.id)).where(Comment.task_id == copied_tasks[0].id)
        )
        == 0
    )
    duplicate_id = UUID(duplicate["id"])
    activity = database_session.scalar(
        select(Activity).where(Activity.resource_id == duplicate_id)
    )
    audit = database_session.scalar(
        select(AuditLog).where(AuditLog.resource_id == duplicate_id)
    )
    assert activity is not None
    assert activity.activity_metadata["source"] == "duplicate"
    assert audit is not None
    assert audit.audit_metadata["source"] == "duplicate"
    assert (
        database_session.scalar(
            select(func.count(Attachment.id)).where(
                Attachment.task_id == copied_tasks[0].id
            )
        )
        == 0
    )


def test_template_export_is_versioned_and_excludes_identifiers(
    client: TestClient,
    project: CreatedProject,
    task_factory: TaskFactory,
) -> None:
    task_factory.create(project, title="Portable task")
    response = client.get(
        f"/api/v1/projects/{project.id}/template",
        headers=project.owner.headers,
    )
    assert response.status_code == 200
    template = response.json()
    assert template["format"] == "taskminer-project-template"
    assert template["version"] == 1
    serialized = json.dumps(template)
    for forbidden in (
        "workspace_id",
        "owner_id",
        "assigned_user_id",
        "email",
        "attachment",
        "comment",
        "created_at",
    ):
        assert forbidden not in serialized


def test_template_import_creates_fresh_unassigned_records(
    client: TestClient,
    project: CreatedProject,
    database_session: Session,
) -> None:
    template = {
        "format": "taskminer-project-template",
        "version": 1,
        "name": "Imported project",
        "description": "Portable",
        "statuses": [
            {
                "key": "backlog",
                "label": "Backlog",
                "position": 0,
                "is_completed": False,
            },
            {"key": "shipped", "label": "Livré", "position": 1, "is_completed": True},
        ],
        "tasks": [
            {
                "title": "Imported task",
                "description": None,
                "priority": "urgent",
                "status": "backlog",
            }
        ],
    }
    response = client.post(
        "/api/v1/projects/import-template",
        headers=project.owner.headers,
        params={"workspace_id": project.workspace_id},
        files={"file": ("template.json", json.dumps(template), "application/json")},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Imported project"
    assert [item["key"] for item in data["task_statuses"]] == ["backlog", "shipped"]
    imported = database_session.scalar(
        select(Task).where(Task.project_id == UUID(data["id"]))
    )
    assert imported is not None
    assert imported.status == "backlog"
    assert imported.assigned_user_id is None


def test_template_import_rejects_unsupported_malformed_and_oversized_files(
    client: TestClient,
    project: CreatedProject,
) -> None:
    unsupported = client.post(
        "/api/v1/projects/import-template",
        headers=project.owner.headers,
        params={"workspace_id": project.workspace_id},
        files={"file": ("template.json", '{"version":2}', "application/json")},
    )
    malformed = client.post(
        "/api/v1/projects/import-template",
        headers=project.owner.headers,
        params={"workspace_id": project.workspace_id},
        files={"file": ("template.json", "not-json", "application/json")},
    )
    oversized = client.post(
        "/api/v1/projects/import-template",
        headers=project.owner.headers,
        params={"workspace_id": project.workspace_id},
        files={"file": ("template.json", b"x" * 1_000_001, "application/json")},
    )
    assert unsupported.status_code == 422
    assert malformed.status_code == 422
    assert oversized.status_code == 413


def test_duplicate_and_import_respect_project_limit(
    client: TestClient,
    project: CreatedProject,
    project_factory: ProjectFactory,
    database_session: Session,
) -> None:
    for index in range(4):
        project_factory.create(project.owner, name=f"Limit {index}")
    count_before = database_session.scalar(select(func.count(Project.id)))

    duplicate = client.post(
        f"/api/v1/projects/{project.id}/duplicate",
        headers=project.owner.headers,
    )
    template = client.get(
        f"/api/v1/projects/{project.id}/template",
        headers=project.owner.headers,
    ).json()
    imported = client.post(
        "/api/v1/projects/import-template",
        headers=project.owner.headers,
        params={"workspace_id": project.workspace_id},
        files={"file": ("template.json", json.dumps(template), "application/json")},
    )
    assert duplicate.status_code == 409
    assert imported.status_code == 409
    assert database_session.scalar(select(func.count(Project.id))) == count_before


def test_duplicate_and_import_do_not_change_free_ai_usage(
    client: TestClient,
    project: CreatedProject,
    database_session: Session,
) -> None:
    database_session.add(
        AIUsageEvent(
            workspace_id=project.workspace_id,
            user_id=project.owner.id,
            free_quota_owner_id=project.owner.id,
            operation_type="project_plan",
            provider="openai",
            model="test-model",
            status="success",
        )
    )
    database_session.commit()
    count_before = database_session.scalar(select(func.count(AIUsageEvent.id)))

    duplicated = client.post(
        f"/api/v1/projects/{project.id}/duplicate",
        headers=project.owner.headers,
    )
    template = client.get(
        f"/api/v1/projects/{project.id}/template",
        headers=project.owner.headers,
    ).json()
    imported = client.post(
        "/api/v1/projects/import-template",
        headers=project.owner.headers,
        params={"workspace_id": project.workspace_id},
        files={"file": ("template.json", json.dumps(template), "application/json")},
    )

    assert duplicated.status_code == 201
    assert imported.status_code == 201
    assert database_session.scalar(select(func.count(AIUsageEvent.id))) == count_before
    summary = client.get(
        f"/api/v1/workspaces/{project.workspace_id}/subscription",
        headers=project.owner.headers,
    )
    assert summary.status_code == 200
    assert summary.json()["usage"]["ai_requests_this_month"] == 1
