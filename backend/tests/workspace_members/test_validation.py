from datetime import datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient
from pydantic import ValidationError
import pytest

from app.schemas.workspace_member import WorkspaceMemberList, WorkspaceMemberRead
from tests.factories import CreatedWorkspace, RegisteredUser


@pytest.mark.parametrize("detail_route", [False, True])
def test_invalid_workspace_uuid_returns_422(
    client: TestClient,
    user: RegisteredUser,
    detail_route: bool,
) -> None:
    path = "/api/v1/workspaces/not-a-uuid/members"
    if detail_route:
        path = f"{path}/{uuid4()}"

    response = client.get(path, headers=user.headers)

    assert response.status_code == 422


def test_invalid_member_uuid_returns_422(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/members/not-a-uuid",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    ("method", "suffix"),
    [
        ("POST", ""),
        ("PATCH", f"/{uuid4()}"),
        ("DELETE", f"/{uuid4()}"),
    ],
)
def test_members_api_is_read_only(
    client: TestClient,
    workspace: CreatedWorkspace,
    method: str,
    suffix: str,
) -> None:
    response = client.request(
        method,
        f"/api/v1/workspaces/{workspace.id}/members{suffix}",
        headers=workspace.owner.headers,
        json={"role": "owner"},
    )

    assert response.status_code == 405


def test_workspace_member_read_forbids_extra_fields() -> None:
    with pytest.raises(ValidationError):
        WorkspaceMemberRead.model_validate(
            {
                "id": uuid4(),
                "workspace_id": uuid4(),
                "user_id": uuid4(),
                "role": "owner",
                "created_at": datetime.now(timezone.utc),
                "unexpected": "forbidden",
            }
        )


def test_workspace_member_list_forbids_extra_fields() -> None:
    with pytest.raises(ValidationError):
        WorkspaceMemberList.model_validate({"items": [], "unexpected": "forbidden"})
