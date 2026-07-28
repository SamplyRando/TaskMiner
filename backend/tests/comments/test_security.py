from uuid import uuid4

from fastapi.testclient import TestClient
from httpx import Response
import pytest
from sqlalchemy.orm import Session

from app.models.comment import Comment
from tests.factories import CreatedComment, RegisteredUser, UserFactory


def request_comment(
    client: TestClient,
    method: str,
    comment_id: object,
    headers: dict[str, str],
) -> Response:
    if method == "PATCH":
        return client.patch(
            f"/api/v1/comments/{comment_id}",
            headers=headers,
            json={"content": "Unauthorized update"},
        )
    return client.request(method, f"/api/v1/comments/{comment_id}", headers=headers)


@pytest.mark.parametrize("method", ["GET", "PATCH", "DELETE"])
def test_missing_comment_returns_404(
    client: TestClient,
    user: RegisteredUser,
    method: str,
) -> None:
    response = request_comment(client, method, uuid4(), user.headers)

    assert response.status_code == 404
    assert response.json() == {"detail": "Comment not found."}


def test_foreign_user_cannot_access_comment_resources(
    client: TestClient,
    comment: CreatedComment,
    other_user: RegisteredUser,
) -> None:
    create_response = client.post(
        f"/api/v1/tasks/{comment.task.id}/comments",
        headers=other_user.headers,
        json={"content": "Foreign comment"},
    )
    list_response = client.get(
        f"/api/v1/tasks/{comment.task.id}/comments",
        headers=other_user.headers,
    )
    read_response = request_comment(client, "GET", comment.id, other_user.headers)
    update_response = request_comment(client, "PATCH", comment.id, other_user.headers)
    delete_response = request_comment(client, "DELETE", comment.id, other_user.headers)

    assert create_response.status_code == 404
    assert list_response.status_code == 404
    assert read_response.status_code == 404
    assert update_response.status_code == 404
    assert delete_response.status_code == 404


def test_task_owner_cannot_modify_comment_authored_by_another_user(
    client: TestClient,
    comment: CreatedComment,
    other_user: RegisteredUser,
    database_session: Session,
) -> None:
    stored_comment = database_session.get(Comment, comment.id)
    assert stored_comment is not None
    stored_comment.author_id = other_user.id
    database_session.commit()

    read_response = request_comment(
        client,
        "GET",
        comment.id,
        comment.task.project.owner.headers,
    )
    update_response = request_comment(
        client,
        "PATCH",
        comment.id,
        comment.task.project.owner.headers,
    )
    delete_response = request_comment(
        client,
        "DELETE",
        comment.id,
        comment.task.project.owner.headers,
    )

    assert read_response.status_code == 200
    assert update_response.status_code == 404
    assert delete_response.status_code == 404


def test_deleted_task_hides_comments_and_rejects_creation(
    client: TestClient,
    comment: CreatedComment,
) -> None:
    headers = comment.task.project.owner.headers
    task_delete_response = client.delete(
        f"/api/v1/tasks/{comment.task.id}",
        headers=headers,
    )
    assert task_delete_response.status_code == 204

    create_response = client.post(
        f"/api/v1/tasks/{comment.task.id}/comments",
        headers=headers,
        json={"content": "Hidden"},
    )
    list_response = client.get(
        f"/api/v1/tasks/{comment.task.id}/comments",
        headers=headers,
    )
    read_response = request_comment(client, "GET", comment.id, headers)
    update_response = request_comment(client, "PATCH", comment.id, headers)
    delete_response = request_comment(client, "DELETE", comment.id, headers)

    assert create_response.status_code == 404
    assert list_response.status_code == 404
    assert read_response.status_code == 404
    assert update_response.status_code == 404
    assert delete_response.status_code == 404


def test_deleted_project_hides_comments_and_rejects_creation(
    client: TestClient,
    comment: CreatedComment,
) -> None:
    headers = comment.task.project.owner.headers
    project_delete_response = client.delete(
        f"/api/v1/projects/{comment.task.project.id}",
        headers=headers,
    )
    assert project_delete_response.status_code == 204

    create_response = client.post(
        f"/api/v1/tasks/{comment.task.id}/comments",
        headers=headers,
        json={"content": "Hidden"},
    )
    list_response = client.get(
        f"/api/v1/tasks/{comment.task.id}/comments",
        headers=headers,
    )
    read_response = request_comment(client, "GET", comment.id, headers)
    update_response = request_comment(client, "PATCH", comment.id, headers)
    delete_response = request_comment(client, "DELETE", comment.id, headers)

    assert create_response.status_code == 404
    assert list_response.status_code == 404
    assert read_response.status_code == 404
    assert update_response.status_code == 404
    assert delete_response.status_code == 404


@pytest.mark.parametrize("account_state", ["inactive", "deleted"])
def test_unavailable_user_cannot_access_comments(
    client: TestClient,
    comment: CreatedComment,
    user_factory: UserFactory,
    account_state: str,
) -> None:
    owner = comment.task.project.owner
    if account_state == "inactive":
        user_factory.set_active(owner, is_active=False)
    else:
        user_factory.delete(owner)

    response = client.get(
        f"/api/v1/comments/{comment.id}",
        headers=owner.headers,
    )

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_missing_token_returns_401(
    client: TestClient,
    comment: CreatedComment,
) -> None:
    response = client.get(f"/api/v1/comments/{comment.id}")

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"
