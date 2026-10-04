from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.attachment import Attachment
from app.models.audit_log import AuditLog
from app.models.comment import Comment
from app.models.task import Task
from app.models.workspace_member import WorkspaceMemberRole
from tests.factories import (
    AttachmentFactory,
    CommentFactory,
    CreatedTask,
    RegisteredUser,
    WorkspaceMemberFactory,
)


def test_duplicate_task_copies_authored_fields_but_not_relations(
    client: TestClient,
    task: CreatedTask,
    attachment_factory: AttachmentFactory,
    comment_factory: CommentFactory,
    database_session: Session,
) -> None:
    attachment_factory.create(task)
    comment_factory.create(task)
    source = database_session.get(Task, task.id)
    assert source is not None
    source.assigned_user_id = task.project.owner.id
    database_session.commit()

    response = client.post(
        f"/api/v1/tasks/{task.id}/duplicate",
        headers=task.project.owner.headers,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["id"] != str(task.id)
    assert data["title"] == f"{task.title} (copie)"
    assert data["description"] == source.description
    assert data["status"] == source.status
    assert data["priority"] == source.priority.value
    assert data["assigned_user_id"] is None
    duplicate_id = UUID(data["id"])
    assert (
        database_session.scalar(
            select(func.count(Comment.id)).where(Comment.task_id == duplicate_id)
        )
        == 0
    )
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
            select(func.count(Attachment.id)).where(Attachment.task_id == duplicate_id)
        )
        == 0
    )


def test_viewer_cannot_duplicate_task(
    client: TestClient,
    task: CreatedTask,
    other_user: RegisteredUser,
    workspace_member_factory: WorkspaceMemberFactory,
) -> None:
    workspace_member_factory.create_for_workspace_id(
        task.project.workspace_id,
        other_user,
        role=WorkspaceMemberRole.VIEWER,
    )
    response = client.post(
        f"/api/v1/tasks/{task.id}/duplicate",
        headers=other_user.headers,
    )
    assert response.status_code == 403
