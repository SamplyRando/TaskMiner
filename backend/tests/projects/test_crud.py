from uuid import UUID

from fastapi.testclient import TestClient

from tests.factories import CreatedProject, ProjectFactory, RegisteredUser


def test_create_project_for_authenticated_user(
    client: TestClient,
    user: RegisteredUser,
) -> None:
    response = client.post(
        "/api/v1/projects",
        headers=user.headers,
        json={"name": "New project", "description": "Project description"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "New project"
    assert data["description"] == "Project description"
    assert UUID(data["owner_id"]) == user.id


def test_list_only_current_user_projects(
    client: TestClient,
    user: RegisteredUser,
    other_user: RegisteredUser,
    project_factory: ProjectFactory,
) -> None:
    first = project_factory.create(user, name="First owned project")
    second = project_factory.create(user, name="Second owned project")
    project_factory.create(other_user, name="Foreign project")

    response = client.get("/api/v1/projects", headers=user.headers)

    assert response.status_code == 200
    project_ids = {UUID(project["id"]) for project in response.json()}
    assert project_ids == {first.id, second.id}


def test_read_project(
    client: TestClient,
    project: CreatedProject,
) -> None:
    response = client.get(
        f"/api/v1/projects/{project.id}",
        headers=project.owner.headers,
    )

    assert response.status_code == 200
    assert UUID(response.json()["id"]) == project.id


def test_update_project(
    client: TestClient,
    project: CreatedProject,
) -> None:
    response = client.patch(
        f"/api/v1/projects/{project.id}",
        headers=project.owner.headers,
        json={"name": "Updated project", "description": None},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated project"
    assert data["description"] is None
    assert UUID(data["owner_id"]) == project.owner.id


def test_delete_project(
    client: TestClient,
    project: CreatedProject,
) -> None:
    response = client.delete(
        f"/api/v1/projects/{project.id}",
        headers=project.owner.headers,
    )

    assert response.status_code == 204
    assert not response.content

    missing_response = client.get(
        f"/api/v1/projects/{project.id}",
        headers=project.owner.headers,
    )
    assert missing_response.status_code == 404


def test_project_list_pagination(
    client: TestClient,
    user: RegisteredUser,
    project_factory: ProjectFactory,
) -> None:
    for index in range(3):
        project_factory.create(user, name=f"Paginated project {index}")

    first_page = client.get(
        "/api/v1/projects",
        headers=user.headers,
        params={"offset": 0, "limit": 2},
    )
    second_page = client.get(
        "/api/v1/projects",
        headers=user.headers,
        params={"offset": 2, "limit": 2},
    )

    assert first_page.status_code == 200
    assert second_page.status_code == 200
    assert len(first_page.json()) == 2
    assert len(second_page.json()) == 1
    assert {item["id"] for item in first_page.json()}.isdisjoint(
        {item["id"] for item in second_page.json()}
    )
