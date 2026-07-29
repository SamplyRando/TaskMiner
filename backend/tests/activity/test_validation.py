from datetime import datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient
from pydantic import TypeAdapter, ValidationError
import pytest

from app.core.events import ActivityEventType, ActivityResourceType
from app.schemas.activity import ActivityFeed, ActivityRead
from tests.factories import CreatedWorkspace, RegisteredUser


@pytest.mark.parametrize(
    "params",
    [
        {"offset": -1},
        {"offset": "invalid"},
        {"limit": 0},
        {"limit": 101},
        {"limit": "invalid"},
        {"unexpected": "forbidden"},
    ],
)
def test_invalid_pagination_returns_422(
    client: TestClient,
    workspace: CreatedWorkspace,
    params: dict[str, object],
) -> None:
    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/activities",
        headers=workspace.owner.headers,
        params=params,
    )

    assert response.status_code == 422


def test_invalid_workspace_uuid_returns_422(
    client: TestClient,
    user: RegisteredUser,
) -> None:
    response = client.get(
        "/api/v1/workspaces/not-a-uuid/activities",
        headers=user.headers,
    )

    assert response.status_code == 422


def test_activity_read_forbids_extra_fields() -> None:
    with pytest.raises(ValidationError):
        ActivityRead.model_validate(
            {
                "id": uuid4(),
                "event_type": "task_created",
                "resource_type": "task",
                "actor_id": uuid4(),
                "activity_metadata": {},
                "created_at": datetime.now(timezone.utc),
                "unexpected": True,
            }
        )


def test_activity_feed_forbids_extra_fields() -> None:
    with pytest.raises(ValidationError):
        ActivityFeed.model_validate({"items": [], "count": 0, "unexpected": True})


@pytest.mark.parametrize(
    ("enum_type", "value"),
    [
        (ActivityEventType, "unknown_event"),
        (ActivityResourceType, "unknown_resource"),
    ],
)
def test_activity_enums_reject_unknown_values(
    enum_type: type[ActivityEventType] | type[ActivityResourceType],
    value: str,
) -> None:
    with pytest.raises(ValidationError):
        TypeAdapter(enum_type).validate_python(value)
