from fastapi.testclient import TestClient
import pytest

from tests.factories import CreatedComment, CreatedTask


@pytest.mark.parametrize("payload", [{}, {"content": ""}, {"content": "x" * 2001}])
def test_create_rejects_invalid_content(
    client: TestClient,
    task: CreatedTask,
    payload: dict[str, object],
) -> None:
    response = client.post(
        f"/api/v1/tasks/{task.id}/comments",
        headers=task.project.owner.headers,
        json=payload,
    )

    assert response.status_code == 422


@pytest.mark.parametrize("content", ["x", "x" * 2000])
def test_create_accepts_content_length_boundaries(
    client: TestClient,
    task: CreatedTask,
    content: str,
) -> None:
    response = client.post(
        f"/api/v1/tasks/{task.id}/comments",
        headers=task.project.owner.headers,
        json={"content": content},
    )

    assert response.status_code == 201
    assert response.json()["content"] == content


@pytest.mark.parametrize(
    "field",
    ["task_id", "author_id", "created_at", "updated_at", "deleted_at"],
)
def test_create_forbids_server_managed_fields(
    client: TestClient,
    task: CreatedTask,
    field: str,
) -> None:
    response = client.post(
        f"/api/v1/tasks/{task.id}/comments",
        headers=task.project.owner.headers,
        json={"content": "Valid", field: "injected"},
    )

    assert response.status_code == 422


@pytest.mark.parametrize("content", ["", None, "x" * 2001])
def test_update_rejects_invalid_content(
    client: TestClient,
    comment: CreatedComment,
    content: object,
) -> None:
    response = client.patch(
        f"/api/v1/comments/{comment.id}",
        headers=comment.task.project.owner.headers,
        json={"content": content},
    )

    assert response.status_code == 422


def test_update_forbids_server_managed_fields(
    client: TestClient,
    comment: CreatedComment,
) -> None:
    response = client.patch(
        f"/api/v1/comments/{comment.id}",
        headers=comment.task.project.owner.headers,
        json={"task_id": str(comment.task.id)},
    )

    assert response.status_code == 422
