from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi.testclient import TestClient
from pydantic import ValidationError
import pytest

from app.schemas.workspace_invitation import (
    InvitationAccept,
    InvitationCreate,
    InvitationList,
    InvitationRead,
)
from tests.factories import CreatedWorkspace, RegisteredUser


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"email": "not-an-email", "role": "member"},
        {"email": "valid@example.com"},
        {"email": "valid@example.com", "role": "manager"},
        {"email": "valid@example.com", "role": "MEMBER"},
        {"email": None, "role": "member"},
        {"email": "valid@example.com", "role": None},
    ],
)
def test_invalid_creation_payload_returns_422(
    client: TestClient,
    workspace: CreatedWorkspace,
    payload: dict[str, object],
) -> None:
    response = client.post(
        f"/api/v1/workspaces/{workspace.id}/invitations",
        headers=workspace.owner.headers,
        json=payload,
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    "server_field",
    ["token", "status", "expires_at", "accepted_at", "revoked_at", "workspace_id"],
)
def test_server_fields_are_rejected(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    server_field: str,
) -> None:
    payload: dict[str, object] = {
        "email": other_user.email,
        "role": "member",
        server_field: "client-controlled-value",
    }

    response = client.post(
        f"/api/v1/workspaces/{workspace.id}/invitations",
        headers=workspace.owner.headers,
        json=payload,
    )

    assert response.status_code == 422


def test_owner_role_cannot_be_invited(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
) -> None:
    response = client.post(
        f"/api/v1/workspaces/{workspace.id}/invitations",
        headers=workspace.owner.headers,
        json={"email": other_user.email, "role": "owner"},
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "A workspace can only have one owner."}


def test_invalid_workspace_uuid_returns_422(
    client: TestClient,
    user: RegisteredUser,
    other_user: RegisteredUser,
) -> None:
    response = client.post(
        "/api/v1/workspaces/not-a-uuid/invitations",
        headers=user.headers,
        json={"email": other_user.email, "role": "member"},
    )

    assert response.status_code == 422


def test_invitation_create_schema_forbids_extra_fields() -> None:
    with pytest.raises(ValidationError):
        InvitationCreate.model_validate(
            {
                "email": "valid@example.com",
                "role": "member",
                "token": "forbidden",
            }
        )


def test_invitation_read_schema_forbids_extra_fields() -> None:
    now = datetime.now(timezone.utc)
    payload = {
        "id": uuid4(),
        "workspace_id": uuid4(),
        "email": "valid@example.com",
        "role": "member",
        "token": "secure-token",
        "status": "pending",
        "expires_at": now + timedelta(days=7),
        "accepted_at": None,
        "revoked_at": None,
        "created_at": now,
        "updated_at": now,
        "unexpected": True,
    }

    with pytest.raises(ValidationError):
        InvitationRead.model_validate(payload)
    with pytest.raises(ValidationError):
        InvitationAccept.model_validate(payload)


def test_invitation_list_schema_forbids_extra_fields() -> None:
    with pytest.raises(ValidationError):
        InvitationList.model_validate({"items": [], "unexpected": True})


@pytest.mark.parametrize("method", ["PATCH", "DELETE"])
def test_invitation_tokens_cannot_be_modified_or_deleted(
    client: TestClient,
    user: RegisteredUser,
    method: str,
) -> None:
    response = client.request(
        method,
        "/api/v1/invitations/immutable-token",
        headers=user.headers,
        json={"token": "replacement"},
    )

    assert response.status_code == 405
