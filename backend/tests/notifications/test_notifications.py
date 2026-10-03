from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi.testclient import TestClient
from pytest import MonkeyPatch
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.events import ActivityEventType, ActivityResourceType, DomainEvent
from app.database.database import SessionLocal
from app.listeners.notification import NotificationListener
from app.models.notification import Notification, NotificationType
from app.models.task import Task
from app.models.workspace_member import WorkspaceMember
from tests.factories import (
    CreatedTask,
    RegisteredUser,
    WorkspaceMemberFactory,
)


def _assign(
    client: TestClient,
    task: CreatedTask,
    actor: RegisteredUser,
    recipient: RegisteredUser,
) -> None:
    response = client.patch(
        f"/api/v1/tasks/{task.id}/assign",
        headers=actor.headers,
        json={"assigned_user_id": str(recipient.id)},
    )
    assert response.status_code == 200, response.text


def _notifications(client: TestClient, user: RegisteredUser) -> list[dict[str, object]]:
    response = client.get("/api/v1/notifications", headers=user.headers)
    assert response.status_code == 200, response.text
    return response.json()["items"]


def test_assignment_notifies_new_assignee_without_private_actor_data(
    client: TestClient,
    task: CreatedTask,
    other_user: RegisteredUser,
    workspace_member_factory: WorkspaceMemberFactory,
) -> None:
    workspace_member_factory.create_for_workspace_id(
        task.project.workspace_id,
        other_user,
    )

    _assign(client, task, task.project.owner, other_user)

    notifications = _notifications(client, other_user)
    assert len(notifications) == 1
    notification = notifications[0]
    assert notification["type"] == "task_assigned"
    assert notification["workspace_id"] == str(task.project.workspace_id)
    assert notification["entity_type"] == "task"
    assert notification["entity_id"] == str(task.id)
    assert task.title in str(notification["message"])
    assert task.project.owner.full_name in str(notification["message"])
    assert task.project.owner.email not in str(notification["message"])
    assert notification["read_at"] is None


def test_assignment_to_self_does_not_notify(
    client: TestClient,
    task: CreatedTask,
) -> None:
    _assign(client, task, task.project.owner, task.project.owner)

    assert _notifications(client, task.project.owner) == []


def test_comment_notifies_assignee_but_not_comment_author(
    client: TestClient,
    task: CreatedTask,
    other_user: RegisteredUser,
    workspace_member_factory: WorkspaceMemberFactory,
) -> None:
    workspace_member_factory.create_for_workspace_id(
        task.project.workspace_id,
        other_user,
    )
    _assign(client, task, task.project.owner, other_user)

    response = client.post(
        f"/api/v1/tasks/{task.id}/comments",
        headers=task.project.owner.headers,
        json={"content": "Le contenu reste dans le commentaire."},
    )

    assert response.status_code == 201
    comment_notifications = [
        item
        for item in _notifications(client, other_user)
        if item["type"] == "task_commented"
    ]
    assert len(comment_notifications) == 1
    assert task.title in str(comment_notifications[0]["message"])
    assert "Le contenu reste" not in str(comment_notifications[0]["message"])
    assert _notifications(client, task.project.owner) == []


def test_comment_by_assignee_does_not_notify_self(
    client: TestClient,
    task: CreatedTask,
) -> None:
    _assign(client, task, task.project.owner, task.project.owner)

    response = client.post(
        f"/api/v1/tasks/{task.id}/comments",
        headers=task.project.owner.headers,
        json={"content": "Auto-commentaire"},
    )

    assert response.status_code == 201
    assert _notifications(client, task.project.owner) == []


def test_disabled_preferences_suppress_matching_notifications(
    client: TestClient,
    task: CreatedTask,
    other_user: RegisteredUser,
    workspace_member_factory: WorkspaceMemberFactory,
) -> None:
    workspace_member_factory.create_for_workspace_id(
        task.project.workspace_id,
        other_user,
    )
    preferences = client.patch(
        "/api/v1/users/me/preferences",
        headers=other_user.headers,
        json={"notify_assignments": False, "notify_comments": False},
    )
    assert preferences.status_code == 200

    _assign(client, task, task.project.owner, other_user)
    comment = client.post(
        f"/api/v1/tasks/{task.id}/comments",
        headers=task.project.owner.headers,
        json={"content": "Pas de notification"},
    )

    assert comment.status_code == 201
    assert _notifications(client, other_user) == []


def test_list_is_recipient_scoped_newest_first_and_counts_unread(
    client: TestClient,
    task: CreatedTask,
    other_user: RegisteredUser,
    workspace_member_factory: WorkspaceMemberFactory,
    database_session: Session,
) -> None:
    workspace_member_factory.create_for_workspace_id(
        task.project.workspace_id,
        other_user,
    )
    now = datetime.now(timezone.utc)
    older = Notification(
        workspace_id=task.project.workspace_id,
        recipient_user_id=other_user.id,
        actor_user_id=task.project.owner.id,
        type=NotificationType.TASK_ASSIGNED.value,
        title="Plus ancienne",
        message="Notification ancienne",
        entity_type="task",
        entity_id=task.id,
        source_event_id=uuid4(),
        created_at=now - timedelta(hours=1),
    )
    newer = Notification(
        workspace_id=task.project.workspace_id,
        recipient_user_id=other_user.id,
        actor_user_id=task.project.owner.id,
        type=NotificationType.TASK_COMMENTED.value,
        title="Plus récente",
        message="Notification récente",
        entity_type="task",
        entity_id=task.id,
        source_event_id=uuid4(),
        created_at=now,
    )
    owner_only = Notification(
        workspace_id=task.project.workspace_id,
        recipient_user_id=task.project.owner.id,
        actor_user_id=other_user.id,
        type=NotificationType.TASK_COMMENTED.value,
        title="Privée",
        message="Réservée au propriétaire",
        entity_type="task",
        entity_id=task.id,
        source_event_id=uuid4(),
        created_at=now + timedelta(minutes=1),
    )
    database_session.add_all([older, newer, owner_only])
    database_session.commit()

    response = client.get(
        "/api/v1/notifications?offset=0&limit=1",
        headers=other_user.headers,
    )
    count = client.get(
        "/api/v1/notifications/unread-count",
        headers=other_user.headers,
    )

    assert response.status_code == 200
    assert response.json()["total"] == 2
    assert [item["title"] for item in response.json()["items"]] == ["Plus récente"]
    assert count.status_code == 200
    assert count.json() == {"unread_count": 2}
    assert "Privée" not in {
        item["title"] for item in _notifications(client, other_user)
    }


def test_read_unread_and_mark_all_are_recipient_scoped(
    client: TestClient,
    task: CreatedTask,
    other_user: RegisteredUser,
    workspace_member_factory: WorkspaceMemberFactory,
) -> None:
    workspace_member_factory.create_for_workspace_id(
        task.project.workspace_id,
        other_user,
    )
    _assign(client, task, task.project.owner, other_user)
    notification_id = str(_notifications(client, other_user)[0]["id"])

    forbidden = client.patch(
        f"/api/v1/notifications/{notification_id}/read",
        headers=task.project.owner.headers,
    )
    read = client.patch(
        f"/api/v1/notifications/{notification_id}/read",
        headers=other_user.headers,
    )
    unread = client.patch(
        f"/api/v1/notifications/{notification_id}/unread",
        headers=other_user.headers,
    )
    all_read = client.patch(
        "/api/v1/notifications/read-all",
        headers=other_user.headers,
    )

    assert forbidden.status_code == 404
    assert read.status_code == 200
    assert read.json()["read_at"] is not None
    assert unread.status_code == 200
    assert unread.json()["read_at"] is None
    assert all_read.status_code == 200
    assert all_read.json() == {"updated_count": 1}
    assert client.get(
        "/api/v1/notifications/unread-count",
        headers=other_user.headers,
    ).json() == {"unread_count": 0}


def test_notifications_are_hidden_after_workspace_membership_ends(
    client: TestClient,
    task: CreatedTask,
    other_user: RegisteredUser,
    workspace_member_factory: WorkspaceMemberFactory,
    database_session: Session,
) -> None:
    membership = workspace_member_factory.create_for_workspace_id(
        task.project.workspace_id,
        other_user,
    )
    _assign(client, task, task.project.owner, other_user)
    notification_id = str(_notifications(client, other_user)[0]["id"])

    stored_membership = database_session.get(WorkspaceMember, membership.id)
    assert stored_membership is not None
    database_session.delete(stored_membership)
    database_session.commit()

    assert _notifications(client, other_user) == []
    mutation = client.patch(
        f"/api/v1/notifications/{notification_id}/read",
        headers=other_user.headers,
    )
    assert mutation.status_code == 404


def test_replayed_domain_event_creates_only_one_notification(
    task: CreatedTask,
    other_user: RegisteredUser,
    workspace_member_factory: WorkspaceMemberFactory,
    database_session: Session,
) -> None:
    workspace_member_factory.create_for_workspace_id(
        task.project.workspace_id,
        other_user,
    )
    event = DomainEvent(
        event_type=ActivityEventType.TASK_ASSIGNED,
        resource_type=ActivityResourceType.TASK,
        workspace_id=task.project.workspace_id,
        resource_id=task.id,
        actor_id=task.project.owner.id,
        old_values={"assigned_user_id": None},
        new_values={"assigned_user_id": str(other_user.id)},
        metadata={"assigned_user_id": str(other_user.id)},
    )
    stored_task = database_session.get(Task, task.id)
    assert stored_task is not None
    stored_task.assigned_user_id = other_user.id
    database_session.commit()
    listener = NotificationListener(SessionLocal)

    listener.handle(event)
    listener.handle(event)

    assert database_session.scalar(select(func.count(Notification.id))) == 1


def test_notification_failure_does_not_fail_assignment(
    client: TestClient,
    task: CreatedTask,
    other_user: RegisteredUser,
    workspace_member_factory: WorkspaceMemberFactory,
    monkeypatch: MonkeyPatch,
) -> None:
    workspace_member_factory.create_for_workspace_id(
        task.project.workspace_id,
        other_user,
    )

    def fail_notification(*_args: object, **_kwargs: object) -> None:
        raise RuntimeError("notification storage unavailable")

    monkeypatch.setattr(
        "app.services.notification.NotificationService.handle_domain_event",
        fail_notification,
    )

    response = client.patch(
        f"/api/v1/tasks/{task.id}/assign",
        headers=task.project.owner.headers,
        json={"assigned_user_id": str(other_user.id)},
    )

    assert response.status_code == 200
    assert response.json()["assigned_user_id"] == str(other_user.id)
