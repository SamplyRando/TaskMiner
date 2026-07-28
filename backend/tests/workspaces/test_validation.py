from fastapi.testclient import TestClient
import pytest

from tests.factories import CreatedWorkspace, RegisteredUser


@pytest.mark.parametrize("payload", [{}, {"name": ""}, {"name": "x" * 256}])
def test_create_rejects_invalid_name(
    client: TestClient,
    user: RegisteredUser,
    payload: dict[str, object],
) -> None:
    response = client.post(
        "/api/v1/workspaces",
        headers=user.headers,
        json=payload,
    )

    assert response.status_code == 422


@pytest.mark.parametrize("name", ["x", "x" * 255])
def test_create_accepts_name_length_boundaries(
    client: TestClient,
    user: RegisteredUser,
    name: str,
) -> None:
    response = client.post(
        "/api/v1/workspaces",
        headers=user.headers,
        json={"name": name},
    )

    assert response.status_code == 201
    assert response.json()["name"] == name
    assert response.json()["description"] is None


@pytest.mark.parametrize(
    "field",
    ["id", "owner_id", "created_at", "updated_at", "deleted_at"],
)
def test_create_forbids_server_managed_fields(
    client: TestClient,
    user: RegisteredUser,
    field: str,
) -> None:
    response = client.post(
        "/api/v1/workspaces",
        headers=user.headers,
        json={"name": "Valid", field: "injected"},
    )

    assert response.status_code == 422


@pytest.mark.parametrize("name", ["", None, "x" * 256])
def test_update_rejects_invalid_name(
    client: TestClient,
    workspace: CreatedWorkspace,
    name: object,
) -> None:
    response = client.patch(
        f"/api/v1/workspaces/{workspace.id}",
        headers=workspace.owner.headers,
        json={"name": name},
    )

    assert response.status_code == 422


def test_update_forbids_server_managed_fields(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    response = client.patch(
        f"/api/v1/workspaces/{workspace.id}",
        headers=workspace.owner.headers,
        json={"owner_id": str(workspace.owner.id)},
    )

    assert response.status_code == 422


@pytest.mark.parametrize("method", ["GET", "PATCH", "DELETE"])
def test_invalid_workspace_uuid_returns_422(
    client: TestClient,
    user: RegisteredUser,
    method: str,
) -> None:
    if method == "PATCH":
        response = client.patch(
            "/api/v1/workspaces/not-a-uuid",
            headers=user.headers,
            json={"name": "Valid"},
        )
    else:
        response = client.request(
            method,
            "/api/v1/workspaces/not-a-uuid",
            headers=user.headers,
        )

    assert response.status_code == 422
