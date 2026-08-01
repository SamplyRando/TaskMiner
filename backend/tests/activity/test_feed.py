from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.activity import Activity
from tests.factories import (
    CreatedWorkspace,
    ProjectFactory,
    RegisteredUser,
    UserFactory,
    WorkspaceFactory,
    WorkspaceInvitationFactory,
)


def get_feed(
    client: TestClient,
    workspace: CreatedWorkspace,
    *,
    offset: int = 0,
    limit: int = 20,
) -> dict[str, Any]:
    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/activities",
        headers=workspace.owner.headers,
        params={"offset": offset, "limit": limit},
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_project_creation_automatically_adds_activity(
    client: TestClient,
    workspace: CreatedWorkspace,
    user: RegisteredUser,
    project_factory: ProjectFactory,
) -> None:
    project = project_factory.create(user, name="Activity project")

    data = get_feed(client, workspace)

    assert data["count"] == 1
    item = data["items"][0]
    assert item["event"] == "project_created"
    assert item["resource"] == "project"
    assert item["actor_id"] == str(user.id)
    assert item["actor"] == {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
    }
    assert item["type"] == "project_created"
    assert item["entity"] == "project"
    assert item["entity_id"] == str(project.id)
    assert item["workspace_id"] == str(workspace.id)
    assert item["message"] == "Projet créé : Activity project"
    assert item["metadata"] == {"name": "Activity project"}
    assert set(item) == {
        "id",
        "type",
        "entity",
        "entity_id",
        "workspace_id",
        "message",
        "event",
        "resource",
        "actor",
        "actor_id",
        "metadata",
        "created_at",
    }
    assert project.name == "Activity project"


def test_feed_is_sorted_newest_first(
    client: TestClient,
    workspace: CreatedWorkspace,
    user: RegisteredUser,
    project_factory: ProjectFactory,
    database_session: Session,
) -> None:
    first_project = project_factory.create(user, name="First")
    second_project = project_factory.create(user, name="Second")
    activities = list(database_session.scalars(select(Activity)).all())
    first_activity = next(
        activity
        for activity in activities
        if activity.activity_metadata["name"] == first_project.name
    )
    second_activity = next(
        activity
        for activity in activities
        if activity.activity_metadata["name"] == second_project.name
    )
    now = datetime.now(timezone.utc)
    first_activity.created_at = now - timedelta(minutes=1)
    second_activity.created_at = now
    database_session.commit()

    data = get_feed(client, workspace)

    assert [item["metadata"]["name"] for item in data["items"]] == [
        "Second",
        "First",
    ]


def test_feed_pagination_and_total_count(
    client: TestClient,
    workspace: CreatedWorkspace,
    user: RegisteredUser,
    project_factory: ProjectFactory,
) -> None:
    for index in range(5):
        project_factory.create(user, name=f"Project {index}")

    first_page = get_feed(client, workspace, offset=0, limit=2)
    second_page = get_feed(client, workspace, offset=2, limit=2)

    assert first_page["count"] == 5
    assert second_page["count"] == 5
    assert len(first_page["items"]) == 2
    assert len(second_page["items"]) == 2
    assert {item["id"] for item in first_page["items"]}.isdisjoint(
        {item["id"] for item in second_page["items"]}
    )


def test_empty_feed(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    assert get_feed(client, workspace) == {"items": [], "count": 0}


def test_workspace_feeds_are_isolated(
    client: TestClient,
    user: RegisteredUser,
    user_factory: UserFactory,
    workspace_factory: WorkspaceFactory,
    workspace_invitation_factory: WorkspaceInvitationFactory,
) -> None:
    first_workspace = workspace_factory.create(user, name="First")
    second_workspace = workspace_factory.create(user, name="Second")
    first_invitee = user_factory.create()
    second_invitee = user_factory.create()
    workspace_invitation_factory.create(first_workspace, first_invitee)
    workspace_invitation_factory.create(second_workspace, second_invitee)

    first_feed = get_feed(client, first_workspace)
    second_feed = get_feed(client, second_workspace)

    assert first_feed["count"] == 1
    assert second_feed["count"] == 1
    assert first_feed["items"][0]["metadata"]["email"] == first_invitee.email
    assert second_feed["items"][0]["metadata"]["email"] == second_invitee.email
