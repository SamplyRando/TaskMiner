from uuid import uuid4

from fastapi.testclient import TestClient
import pytest

from app.core.events import (
    ActivityEventType,
    ActivityResourceType,
    DomainEvent,
    publish,
    subscribe,
    unsubscribe,
)
from app.models.workspace_member import WorkspaceMemberRole
from tests.factories import (
    AttachmentFactory,
    CommentFactory,
    CreatedWorkspace,
    ProjectFactory,
    RegisteredUser,
    TaskFactory,
    WorkspaceInvitationFactory,
    WorkspaceMemberFactory,
)


def activity_items(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> list[dict[str, object]]:
    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/activities",
        headers=workspace.owner.headers,
    )
    assert response.status_code == 200
    return response.json()["items"]


def test_publish_subscribe_and_unsubscribe() -> None:
    received: list[DomainEvent] = []
    event = DomainEvent(
        event_type=ActivityEventType.WORKSPACE_CREATED,
        resource_type=ActivityResourceType.WORKSPACE,
        workspace_id=uuid4(),
        resource_id=uuid4(),
        actor_id=None,
    )

    subscribe(received.append)
    subscribe(received.append)
    try:
        publish(event)
    finally:
        unsubscribe(received.append)
    publish(event)

    assert received == [event]


def test_activity_listener_persists_domain_event(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    event = DomainEvent(
        event_type=ActivityEventType.WORKSPACE_UPDATED,
        resource_type=ActivityResourceType.WORKSPACE,
        workspace_id=workspace.id,
        resource_id=workspace.id,
        actor_id=workspace.owner.id,
        metadata={"fields": ["name"]},
    )

    publish(event)

    item = activity_items(client, workspace)[0]
    assert item["event"] == "workspace_updated"
    assert item["resource"] == "workspace"
    assert item["metadata"] == {"fields": ["name"]}


def test_project_create_and_delete_events(
    client: TestClient,
    workspace: CreatedWorkspace,
    user: RegisteredUser,
    project_factory: ProjectFactory,
) -> None:
    project = project_factory.create(user, name="Disposable project")
    deleted = client.delete(
        f"/api/v1/projects/{project.id}",
        headers=user.headers,
    )
    assert deleted.status_code == 204

    items = activity_items(client, workspace)

    assert [item["event"] for item in items] == [
        "project_deleted",
        "project_created",
    ]


def test_task_create_update_and_delete_events(
    client: TestClient,
    workspace: CreatedWorkspace,
    user: RegisteredUser,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
) -> None:
    project = project_factory.create(user)
    task = task_factory.create(project, title="Lifecycle task")
    updated = client.patch(
        f"/api/v1/tasks/{task.id}",
        headers=user.headers,
        json={"title": "Updated task"},
    )
    deleted = client.delete(
        f"/api/v1/tasks/{task.id}",
        headers=user.headers,
    )
    assert updated.status_code == 200
    assert deleted.status_code == 204

    task_items = [
        item for item in activity_items(client, workspace) if item["resource"] == "task"
    ]

    assert [item["event"] for item in task_items] == [
        "task_deleted",
        "task_updated",
        "task_created",
    ]
    assert task_items[1]["metadata"] == {"fields": ["title"]}


def test_task_assignment_event(
    client: TestClient,
    workspace: CreatedWorkspace,
    user: RegisteredUser,
    other_user: RegisteredUser,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
) -> None:
    project = project_factory.create(user)
    task = task_factory.create(project)

    response = client.patch(
        f"/api/v1/tasks/{task.id}/assign",
        headers=user.headers,
        json={"assigned_user_id": str(other_user.id)},
    )

    assert response.status_code == 200
    item = activity_items(client, workspace)[0]
    assert item["event"] == "task_assigned"
    assert item["metadata"] == {"assigned_user_id": str(other_user.id)}


def test_comment_creation_event(
    client: TestClient,
    workspace: CreatedWorkspace,
    user: RegisteredUser,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
    comment_factory: CommentFactory,
) -> None:
    project = project_factory.create(user)
    task = task_factory.create(project)
    comment = comment_factory.create(task, content="Activity comment")

    item = activity_items(client, workspace)[0]

    assert item["event"] == "comment_created"
    assert item["resource"] == "comment"
    assert item["metadata"] == {"task_id": str(task.id)}
    assert comment.content == "Activity comment"


def test_attachment_upload_event(
    client: TestClient,
    workspace: CreatedWorkspace,
    user: RegisteredUser,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
    attachment_factory: AttachmentFactory,
) -> None:
    project = project_factory.create(user)
    task = task_factory.create(project)
    attachment_factory.create(
        task,
        filename="activity.txt",
        content=b"activity",
    )

    item = activity_items(client, workspace)[0]

    assert item["event"] == "attachment_uploaded"
    assert item["resource"] == "attachment"
    assert item["metadata"] == {
        "filename": "activity.txt",
        "file_size": 8,
        "task_id": str(task.id),
    }


def test_invitation_create_and_accept_events(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    workspace_invitation_factory: WorkspaceInvitationFactory,
) -> None:
    invitation = workspace_invitation_factory.create(
        workspace,
        other_user,
        role=WorkspaceMemberRole.VIEWER,
    )
    accepted = client.post(
        f"/api/v1/invitations/{invitation.token}/accept",
        headers=other_user.headers,
    )
    assert accepted.status_code == 200

    invitation_items = [
        item
        for item in activity_items(client, workspace)
        if item["resource"] == "invitation"
    ]

    assert [item["event"] for item in invitation_items] == [
        "invitation_accepted",
        "invitation_created",
    ]
    assert invitation_items[0]["metadata"] == {
        "email": other_user.email,
        "role": "viewer",
    }


def test_member_role_update_event(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    workspace_member_factory: WorkspaceMemberFactory,
) -> None:
    member = workspace_member_factory.create(workspace, other_user)

    response = client.patch(
        f"/api/v1/workspaces/{workspace.id}/members/{member.id}/role",
        headers=workspace.owner.headers,
        json={"role": "admin"},
    )

    assert response.status_code == 200
    item = activity_items(client, workspace)[0]
    assert item["event"] == "member_role_updated"
    assert item["resource"] == "member"
    assert item["metadata"] == {
        "new_role": "admin",
        "previous_role": "member",
        "user_id": str(other_user.id),
    }


@pytest.mark.parametrize(
    "invalid_metadata", [{"value": {1, 2}}, {"value": float("nan")}]
)
def test_domain_event_rejects_non_json_metadata(
    invalid_metadata: dict[str, object],
) -> None:
    with pytest.raises(ValueError, match="valid JSON"):
        DomainEvent(
            event_type=ActivityEventType.PROJECT_CREATED,
            resource_type=ActivityResourceType.PROJECT,
            workspace_id=uuid4(),
            resource_id=uuid4(),
            actor_id=None,
            metadata=invalid_metadata,
        )
