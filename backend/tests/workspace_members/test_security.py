from uuid import uuid4

from fastapi.testclient import TestClient
import pytest

from tests.factories import (
    CreatedWorkspace,
    RegisteredUser,
    UserFactory,
    WorkspaceFactory,
)


def get_owner_member_id(client: TestClient, workspace: CreatedWorkspace) -> str:
    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/members",
        headers=workspace.owner.headers,
    )
    assert response.status_code == 200
    return str(response.json()["items"][0]["id"])


@pytest.mark.parametrize("detail_route", [False, True])
def test_missing_workspace_returns_404(
    client: TestClient,
    user: RegisteredUser,
    detail_route: bool,
) -> None:
    workspace_id = uuid4()
    path = f"/api/v1/workspaces/{workspace_id}/members"
    if detail_route:
        path = f"{path}/{uuid4()}"

    response = client.get(path, headers=user.headers)

    assert response.status_code == 404
    assert response.json() == {"detail": "Workspace not found."}


@pytest.mark.parametrize("detail_route", [False, True])
def test_foreign_workspace_is_hidden(
    client: TestClient,
    user: RegisteredUser,
    other_user: RegisteredUser,
    workspace_factory: WorkspaceFactory,
    detail_route: bool,
) -> None:
    foreign_workspace = workspace_factory.create(other_user)
    path = f"/api/v1/workspaces/{foreign_workspace.id}/members"
    if detail_route:
        member_id = get_owner_member_id(client, foreign_workspace)
        path = f"{path}/{member_id}"

    response = client.get(path, headers=user.headers)

    assert response.status_code == 404
    assert response.json() == {"detail": "Workspace not found."}


def test_missing_member_returns_404(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/members/{uuid4()}",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Workspace member not found."}


def test_member_from_another_workspace_is_hidden(
    client: TestClient,
    user: RegisteredUser,
    workspace_factory: WorkspaceFactory,
) -> None:
    first_workspace = workspace_factory.create(user, name="First")
    second_workspace = workspace_factory.create(user, name="Second")
    second_member_id = get_owner_member_id(client, second_workspace)

    response = client.get(
        f"/api/v1/workspaces/{first_workspace.id}/members/{second_member_id}",
        headers=user.headers,
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Workspace member not found."}


@pytest.mark.parametrize("detail_route", [False, True])
def test_deleted_workspace_hides_members(
    client: TestClient,
    workspace: CreatedWorkspace,
    detail_route: bool,
) -> None:
    member_id = get_owner_member_id(client, workspace)
    delete_response = client.delete(
        f"/api/v1/workspaces/{workspace.id}",
        headers=workspace.owner.headers,
    )
    assert delete_response.status_code == 204

    path = f"/api/v1/workspaces/{workspace.id}/members"
    if detail_route:
        path = f"{path}/{member_id}"
    response = client.get(path, headers=workspace.owner.headers)

    assert response.status_code == 404
    assert response.json() == {"detail": "Workspace not found."}


@pytest.mark.parametrize("account_state", ["inactive", "deleted"])
def test_unavailable_owner_cannot_access_members(
    client: TestClient,
    workspace: CreatedWorkspace,
    user_factory: UserFactory,
    account_state: str,
) -> None:
    if account_state == "inactive":
        user_factory.set_active(workspace.owner, is_active=False)
    else:
        user_factory.delete(workspace.owner)

    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/members",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_missing_token_returns_401(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    response = client.get(f"/api/v1/workspaces/{workspace.id}/members")

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"
