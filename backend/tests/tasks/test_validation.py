from fastapi.testclient import TestClient

from tests.factories import CreatedProject


def test_task_title_cannot_be_only_whitespace(
    client: TestClient,
    project: CreatedProject,
) -> None:
    response = client.post(
        f"/api/v1/projects/{project.id}/tasks",
        headers=project.owner.headers,
        json={"title": "   "},
    )

    assert response.status_code == 422


def test_task_description_has_a_production_size_limit(
    client: TestClient,
    project: CreatedProject,
) -> None:
    response = client.post(
        f"/api/v1/projects/{project.id}/tasks",
        headers=project.owner.headers,
        json={"title": "Valid", "description": "x" * 5_001},
    )

    assert response.status_code == 422
