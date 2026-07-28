from uuid import uuid4

from fastapi.testclient import TestClient
from httpx import Response
import pytest
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.workspace import Workspace
from tests.factories import (
    AttachmentFactory,
    CommentFactory,
    CreatedWorkspace,
    ProjectFactory,
    RegisteredUser,
    TaskFactory,
    UserFactory,
    WorkspaceFactory,
)


def request_workspace(
    client: TestClient,
    method: str,
    workspace_id: object,
    headers: dict[str, str],
) -> Response:
    if method == "PATCH":
        return client.patch(
            f"/api/v1/workspaces/{workspace_id}",
            headers=headers,
            json={"name": "Unauthorized update"},
        )
    return client.request(
        method,
        f"/api/v1/workspaces/{workspace_id}",
        headers=headers,
    )


@pytest.mark.parametrize("method", ["GET", "PATCH", "DELETE"])
def test_missing_workspace_returns_404(
    client: TestClient,
    user: RegisteredUser,
    method: str,
) -> None:
    response = request_workspace(client, method, uuid4(), user.headers)

    assert response.status_code == 404
    assert response.json() == {"detail": "Workspace not found."}


@pytest.mark.parametrize("method", ["GET", "PATCH", "DELETE"])
def test_foreign_workspace_is_hidden(
    client: TestClient,
    user: RegisteredUser,
    other_user: RegisteredUser,
    workspace_factory: WorkspaceFactory,
    method: str,
) -> None:
    foreign_workspace = workspace_factory.create(other_user)

    foreign_response = request_workspace(
        client,
        method,
        foreign_workspace.id,
        user.headers,
    )
    missing_response = request_workspace(client, method, uuid4(), user.headers)

    assert foreign_response.status_code == 404
    assert foreign_response.json() == missing_response.json()


@pytest.mark.parametrize("account_state", ["inactive", "deleted"])
def test_unavailable_user_cannot_access_workspaces(
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
        f"/api/v1/workspaces/{workspace.id}",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_missing_token_returns_401(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    response = client.get(f"/api/v1/workspaces/{workspace.id}")

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_deleted_workspace_hides_all_descendant_resources(
    client: TestClient,
    user: RegisteredUser,
    workspace_factory: WorkspaceFactory,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
    comment_factory: CommentFactory,
    attachment_factory: AttachmentFactory,
    database_session: Session,
) -> None:
    workspace = workspace_factory.create(user)
    project = project_factory.create(user)
    task = task_factory.create(project)
    comment = comment_factory.create(task)
    attachment = attachment_factory.create(task)

    delete_response = client.delete(
        f"/api/v1/workspaces/{workspace.id}",
        headers=user.headers,
    )
    assert delete_response.status_code == 204

    project_response = client.get(
        f"/api/v1/projects/{project.id}",
        headers=user.headers,
    )
    task_response = client.get(
        f"/api/v1/tasks/{task.id}",
        headers=user.headers,
    )
    comment_response = client.get(
        f"/api/v1/comments/{comment.id}",
        headers=user.headers,
    )
    attachment_response = client.get(
        f"/api/v1/attachments/{attachment.id}",
        headers=user.headers,
    )
    project_list_response = client.get("/api/v1/projects", headers=user.headers)
    task_list_response = client.get("/api/v1/tasks", headers=user.headers)

    for response in (
        project_response,
        task_response,
        comment_response,
        attachment_response,
    ):
        assert response.status_code == 404
    assert project_list_response.status_code == 200
    assert project_list_response.json()["total"] == 0
    assert task_list_response.status_code == 200
    assert task_list_response.json()["total"] == 0

    database_session.expire_all()
    stored_workspace = database_session.get(Workspace, workspace.id)
    stored_project = database_session.get(Project, project.id)
    assert stored_workspace is not None
    assert stored_workspace.deleted_at is not None
    assert stored_project is not None
    assert stored_project.deleted_at is None
