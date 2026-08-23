from fastapi.testclient import TestClient

from app.models.workspace_member import WorkspaceMemberRole
from tests.factories import (
    AttachmentFactory,
    CommentFactory,
    CreatedWorkspace,
    ProjectFactory,
    RegisteredUser,
    TaskFactory,
    WorkspaceMemberFactory,
)


def test_member_can_read_workspace_projects_and_manage_tasks(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
    workspace_member_factory: WorkspaceMemberFactory,
) -> None:
    project = project_factory.create(workspace.owner, name="Shared project")
    task = task_factory.create(project, title="Shared task")
    workspace_member_factory.create(workspace, other_user)

    workspace_response = client.get(
        f"/api/v1/workspaces/{workspace.id}",
        headers=other_user.headers,
    )
    projects_response = client.get(
        "/api/v1/projects",
        headers=other_user.headers,
        params={"workspace_id": str(workspace.id)},
    )
    task_response = client.get(
        f"/api/v1/tasks/{task.id}",
        headers=other_user.headers,
    )
    update_response = client.patch(
        f"/api/v1/tasks/{task.id}",
        headers=other_user.headers,
        json={"priority": "high"},
    )
    dashboard_response = client.get(
        "/api/v1/dashboard",
        headers=other_user.headers,
        params={"workspace_id": str(workspace.id)},
    )

    assert workspace_response.status_code == 200
    assert projects_response.status_code == 200
    assert [item["id"] for item in projects_response.json()["items"]] == [
        str(project.id)
    ]
    assert task_response.status_code == 200
    assert update_response.status_code == 200
    assert update_response.json()["priority"] == "high"
    assert dashboard_response.status_code == 200
    assert dashboard_response.json()["kpis"]["projects"] == 1
    assert dashboard_response.json()["kpis"]["tasks"] == 1


def test_viewer_can_read_but_cannot_mutate_core_resources(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
    workspace_member_factory: WorkspaceMemberFactory,
) -> None:
    project = project_factory.create(workspace.owner)
    task = task_factory.create(project)
    workspace_member_factory.create(
        workspace,
        other_user,
        role=WorkspaceMemberRole.VIEWER,
    )

    assert (
        client.get(
            f"/api/v1/projects/{project.id}", headers=other_user.headers
        ).status_code
        == 200
    )
    assert (
        client.get(f"/api/v1/tasks/{task.id}", headers=other_user.headers).status_code
        == 200
    )
    assert (
        client.patch(
            f"/api/v1/tasks/{task.id}",
            headers=other_user.headers,
            json={"status": "done"},
        ).status_code
        == 403
    )
    assert (
        client.delete(
            f"/api/v1/projects/{project.id}", headers=other_user.headers
        ).status_code
        == 403
    )


def test_admin_can_create_and_update_project_in_shared_workspace(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    project_factory: ProjectFactory,
    workspace_member_factory: WorkspaceMemberFactory,
) -> None:
    existing = project_factory.create(workspace.owner)
    workspace_member_factory.create(
        workspace,
        other_user,
        role=WorkspaceMemberRole.ADMIN,
    )

    created = client.post(
        "/api/v1/projects",
        headers=other_user.headers,
        params={"workspace_id": str(workspace.id)},
        json={"name": "Admin project"},
    )
    updated = client.patch(
        f"/api/v1/projects/{existing.id}",
        headers=other_user.headers,
        json={"name": "Updated by admin"},
    )

    assert created.status_code == 201
    assert created.json()["workspace_id"] == str(workspace.id)
    assert updated.status_code == 200
    assert updated.json()["name"] == "Updated by admin"


def test_member_cannot_create_project_in_shared_workspace(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    workspace_member_factory: WorkspaceMemberFactory,
) -> None:
    workspace_member_factory.create(workspace, other_user)

    response = client.post(
        "/api/v1/projects",
        headers=other_user.headers,
        params={"workspace_id": str(workspace.id)},
        json={"name": "Forbidden project"},
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "Insufficient permissions."}


def test_member_and_viewer_resource_permissions_follow_role_matrix(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
    comment_factory: CommentFactory,
    attachment_factory: AttachmentFactory,
    workspace_member_factory: WorkspaceMemberFactory,
) -> None:
    project = project_factory.create(workspace.owner)
    task = task_factory.create(project)
    comment = comment_factory.create(task)
    attachment = attachment_factory.create(task)
    workspace_member_factory.create(
        workspace,
        other_user,
        role=WorkspaceMemberRole.VIEWER,
    )

    comments = client.get(
        f"/api/v1/tasks/{task.id}/comments",
        headers=other_user.headers,
    )
    comment_detail = client.get(
        f"/api/v1/comments/{comment.id}",
        headers=other_user.headers,
    )
    attachment_detail = client.get(
        f"/api/v1/attachments/{attachment.id}",
        headers=other_user.headers,
    )
    create_comment = client.post(
        f"/api/v1/tasks/{task.id}/comments",
        headers=other_user.headers,
        json={"content": "Not allowed"},
    )

    assert comments.status_code == 200
    assert comment_detail.status_code == 200
    assert attachment_detail.status_code == 200
    assert create_comment.status_code == 403
