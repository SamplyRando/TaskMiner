from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.comment import Comment
from app.models.task import Task
from tests.factories import CommentFactory, CreatedComment, CreatedTask, TaskFactory


def test_create_comment_records_authenticated_author(
    client: TestClient,
    task: CreatedTask,
    database_session: Session,
) -> None:
    response = client.post(
        f"/api/v1/tasks/{task.id}/comments",
        headers=task.project.owner.headers,
        json={"content": "First task comment"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["content"] == "First task comment"
    assert data["task_id"] == str(task.id)
    assert data["author_id"] == str(task.project.owner.id)
    assert "deleted_at" not in data

    stored_comment = database_session.scalar(
        select(Comment).where(Comment.id == data["id"])
    )
    assert stored_comment is not None
    assert stored_comment.task_id == task.id
    assert stored_comment.author_id == task.project.owner.id
    assert stored_comment.deleted_at is None


def test_list_comments_returns_only_requested_task_comments(
    client: TestClient,
    task: CreatedTask,
    comment_factory: CommentFactory,
    task_factory: TaskFactory,
) -> None:
    first = comment_factory.create(task, content="First")
    second = comment_factory.create(task, content="Second")
    other_task = task_factory.create(task.project)
    comment_factory.create(other_task, content="Other task")

    response = client.get(
        f"/api/v1/tasks/{task.id}/comments",
        headers=task.project.owner.headers,
    )

    assert response.status_code == 200
    assert {item["id"] for item in response.json()} == {
        str(first.id),
        str(second.id),
    }


def test_get_comment(
    client: TestClient,
    comment: CreatedComment,
) -> None:
    response = client.get(
        f"/api/v1/comments/{comment.id}",
        headers=comment.task.project.owner.headers,
    )

    assert response.status_code == 200
    assert response.json()["id"] == str(comment.id)
    assert response.json()["content"] == comment.content


def test_update_comment(
    client: TestClient,
    comment: CreatedComment,
    database_session: Session,
) -> None:
    response = client.patch(
        f"/api/v1/comments/{comment.id}",
        headers=comment.task.project.owner.headers,
        json={"content": "Updated comment"},
    )

    assert response.status_code == 200
    assert response.json()["content"] == "Updated comment"
    database_session.expire_all()
    stored_comment = database_session.get(Comment, comment.id)
    assert stored_comment is not None
    assert stored_comment.content == "Updated comment"


def test_empty_patch_keeps_comment_unchanged(
    client: TestClient,
    comment: CreatedComment,
) -> None:
    response = client.patch(
        f"/api/v1/comments/{comment.id}",
        headers=comment.task.project.owner.headers,
        json={},
    )

    assert response.status_code == 200
    assert response.json()["content"] == comment.content


def test_delete_comment_soft_deletes_and_hides_it(
    client: TestClient,
    comment: CreatedComment,
    database_session: Session,
) -> None:
    stored_before = database_session.get(Comment, comment.id)
    assert stored_before is not None
    created_at = stored_before.created_at
    updated_at = stored_before.updated_at

    delete_response = client.delete(
        f"/api/v1/comments/{comment.id}",
        headers=comment.task.project.owner.headers,
    )

    assert delete_response.status_code == 204
    database_session.expire_all()
    deleted_comment = database_session.get(Comment, comment.id)
    assert deleted_comment is not None
    assert deleted_comment.deleted_at is not None
    assert deleted_comment.deleted_at.utcoffset() == timedelta(0)
    assert deleted_comment.created_at == created_at
    assert deleted_comment.updated_at >= updated_at

    get_response = client.get(
        f"/api/v1/comments/{comment.id}",
        headers=comment.task.project.owner.headers,
    )
    list_response = client.get(
        f"/api/v1/tasks/{comment.task.id}/comments",
        headers=comment.task.project.owner.headers,
    )
    second_delete_response = client.delete(
        f"/api/v1/comments/{comment.id}",
        headers=comment.task.project.owner.headers,
    )

    assert get_response.status_code == 404
    assert list_response.status_code == 200
    assert list_response.json() == []
    assert second_delete_response.status_code == 404


def test_physical_task_deletion_cascades_to_comments(
    comment: CreatedComment,
    database_session: Session,
) -> None:
    task = database_session.get(Task, comment.task.id)
    assert task is not None

    database_session.delete(task)
    database_session.commit()

    assert database_session.get(Comment, comment.id) is None
