from datetime import datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient
from pydantic import ValidationError
import pytest

from app.core.events import (
    ActivityEventType,
    ActivityResourceType,
    DomainEvent,
)
from app.schemas.audit import AuditFeed, AuditRead
from tests.factories import CreatedWorkspace, RegisteredUser


@pytest.mark.parametrize(
    "params",
    [
        {"offset": -1},
        {"offset": "invalid"},
        {"limit": 0},
        {"limit": 101},
        {"limit": "invalid"},
        {"event_type": "unknown_event"},
        {"resource_type": "unknown_resource"},
        {"actor_id": "not-a-uuid"},
        {"period": "year"},
        {"success": "maybe"},
        {"search": ""},
        {"search": "x" * 256},
        {"unexpected": "forbidden"},
    ],
)
def test_invalid_query_parameters_return_422(
    client: TestClient,
    workspace: CreatedWorkspace,
    params: dict[str, object],
) -> None:
    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/audit",
        headers=workspace.owner.headers,
        params=params,
    )

    assert response.status_code == 422


def test_invalid_workspace_uuid_returns_422(
    client: TestClient,
    user: RegisteredUser,
) -> None:
    response = client.get(
        "/api/v1/workspaces/not-a-uuid/audit",
        headers=user.headers,
    )

    assert response.status_code == 422


@pytest.mark.parametrize("field_name", ["old_values", "new_values", "metadata"])
def test_domain_event_rejects_invalid_audit_json(field_name: str) -> None:
    payload: dict[str, object] = {
        "event_type": ActivityEventType.PROJECT_UPDATED,
        "resource_type": ActivityResourceType.PROJECT,
        "workspace_id": uuid4(),
        "resource_id": uuid4(),
        "actor_id": None,
        field_name: {"invalid": {1, 2}},
    }

    with pytest.raises(ValueError, match=field_name):
        DomainEvent(**payload)  # type: ignore[arg-type]


def test_audit_read_forbids_extra_fields() -> None:
    with pytest.raises(ValidationError):
        AuditRead.model_validate(
            {
                "id": uuid4(),
                "workspace_id": uuid4(),
                "workspace_name": "Workspace",
                "actor": None,
                "event": "task_updated",
                "resource": "task",
                "resource_id": uuid4(),
                "actor_id": uuid4(),
                "old_values": {"title": "Before"},
                "new_values": {"title": "After"},
                "metadata": {},
                "message": "Tâche modifiée",
                "success": True,
                "created_at": datetime.now(timezone.utc),
                "unexpected": True,
            }
        )


def test_audit_feed_forbids_extra_fields() -> None:
    with pytest.raises(ValidationError):
        AuditFeed.model_validate({"items": [], "count": 0, "unexpected": True})
