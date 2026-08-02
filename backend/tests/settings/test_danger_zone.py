from fastapi.testclient import TestClient

from tests.factories import (
    CreatedWorkspace,
    RegisteredUser,
    WorkspaceMemberFactory,
)


def confirmation(user: RegisteredUser) -> dict[str, str]:
    return {"confirmation": "DELETE", "current_password": user.password}


def test_member_can_leave_workspace(
    client: TestClient,
    user: RegisteredUser,
    other_user: RegisteredUser,
    workspace: CreatedWorkspace,
    workspace_member_factory: WorkspaceMemberFactory,
) -> None:
    workspace_member_factory.create(workspace, other_user)

    response = client.request(
        "DELETE",
        f"/api/v1/users/me/workspaces/{workspace.id}/membership",
        headers=other_user.headers,
        json=confirmation(other_user),
    )

    assert response.status_code == 204
    visible = client.get("/api/v1/workspaces", headers=other_user.headers)
    assert visible.json() == []
    assert client.get("/api/v1/workspaces", headers=user.headers).status_code == 200


def test_owner_cannot_leave_owned_workspace(
    client: TestClient,
    user: RegisteredUser,
    workspace: CreatedWorkspace,
) -> None:
    response = client.request(
        "DELETE",
        f"/api/v1/users/me/workspaces/{workspace.id}/membership",
        headers=user.headers,
        json=confirmation(user),
    )

    assert response.status_code == 409


def test_leave_workspace_requires_current_password(
    client: TestClient,
    other_user: RegisteredUser,
    workspace: CreatedWorkspace,
    workspace_member_factory: WorkspaceMemberFactory,
) -> None:
    workspace_member_factory.create(workspace, other_user)
    payload = confirmation(other_user)
    payload["current_password"] = "incorrect"

    response = client.request(
        "DELETE",
        f"/api/v1/users/me/workspaces/{workspace.id}/membership",
        headers=other_user.headers,
        json=payload,
    )

    assert response.status_code == 400


def test_delete_account_anonymizes_identity_and_revokes_access(
    client: TestClient,
    user: RegisteredUser,
) -> None:
    response = client.request(
        "DELETE",
        "/api/v1/users/me",
        headers=user.headers,
        json={"confirmation": "SUPPRIMER", "current_password": user.password},
    )

    assert response.status_code == 204
    assert client.get("/api/v1/users/me", headers=user.headers).status_code == 401
    login = client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": user.password},
    )
    assert login.status_code == 401


def test_delete_account_refuses_to_orphan_an_owned_workspace(
    client: TestClient,
    user: RegisteredUser,
    workspace: CreatedWorkspace,
) -> None:
    del workspace
    response = client.request(
        "DELETE",
        "/api/v1/users/me",
        headers=user.headers,
        json=confirmation(user),
    )

    assert response.status_code == 409
    assert "owned workspaces" in response.json()["detail"]


def test_danger_actions_require_exact_confirmation(
    client: TestClient,
    user: RegisteredUser,
) -> None:
    response = client.request(
        "DELETE",
        "/api/v1/users/me",
        headers=user.headers,
        json={"confirmation": "delete", "current_password": user.password},
    )

    assert response.status_code == 422
