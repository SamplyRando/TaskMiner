from datetime import datetime, timezone

from fastapi.testclient import TestClient
import pytest
from sqlalchemy.orm import Session

from app.models.project import Project
from tests.factories import ProjectFactory, RegisteredUser


def test_project_search_is_case_insensitive_across_fields(
    client: TestClient,
    user: RegisteredUser,
    other_user: RegisteredUser,
    project_factory: ProjectFactory,
) -> None:
    name_match = project_factory.create(user, name="Dashboard API")
    description_match = project_factory.create(
        user,
        name="Analytics",
        description="Internal dashboard metrics",
    )
    project_factory.create(user, name="Unrelated project")
    project_factory.create(other_user, name="Foreign dashboard")

    response = client.get(
        "/api/v1/projects",
        headers=user.headers,
        params={"search": "DASHBOARD"},
    )

    assert response.status_code == 200
    data = response.json()
    assert {item["id"] for item in data["items"]} == {
        str(name_match.id),
        str(description_match.id),
    }
    assert data["total"] == 2


def test_project_sort_supports_timestamps_in_both_directions(
    client: TestClient,
    user: RegisteredUser,
    project_factory: ProjectFactory,
    database_session: Session,
) -> None:
    first = project_factory.create(user, name="First project")
    second = project_factory.create(user, name="Second project")

    first_model = database_session.get(Project, first.id)
    second_model = database_session.get(Project, second.id)
    assert first_model is not None
    assert second_model is not None
    first_model.created_at = datetime(2025, 1, 1, tzinfo=timezone.utc)
    first_model.updated_at = datetime(2025, 2, 1, tzinfo=timezone.utc)
    second_model.created_at = datetime(2025, 1, 2, tzinfo=timezone.utc)
    second_model.updated_at = datetime(2025, 1, 1, tzinfo=timezone.utc)
    database_session.commit()

    expectations = {
        "created_at": [str(first.id), str(second.id)],
        "-created_at": [str(second.id), str(first.id)],
        "updated_at": [str(second.id), str(first.id)],
        "-updated_at": [str(first.id), str(second.id)],
    }
    for sort, expected_ids in expectations.items():
        response = client.get(
            "/api/v1/projects",
            headers=user.headers,
            params={"sort": sort},
        )
        assert response.status_code == 200
        assert [item["id"] for item in response.json()["items"]] == expected_ids


def test_project_listing_combines_search_sort_and_pagination(
    client: TestClient,
    user: RegisteredUser,
    project_factory: ProjectFactory,
) -> None:
    for name in ("Dashboard Charlie", "Dashboard Alpha", "Dashboard Bravo"):
        project_factory.create(user, name=name)
    project_factory.create(user, name="Unrelated")

    response = client.get(
        "/api/v1/projects",
        headers=user.headers,
        params={
            "search": "dashboard",
            "sort": "name",
            "skip": 1,
            "limit": 1,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert [item["name"] for item in data["items"]] == ["Dashboard Bravo"]
    assert data["total"] == 3
    assert data["skip"] == 1
    assert data["limit"] == 1


@pytest.mark.parametrize(
    "params",
    [
        {"skip": -1},
        {"limit": 0},
        {"limit": 101},
        {"sort": "title"},
        {"sort": "-unknown"},
        {"search": ""},
        {"offset": 0},
    ],
)
def test_project_list_rejects_invalid_parameters(
    client: TestClient,
    user: RegisteredUser,
    params: dict[str, object],
) -> None:
    response = client.get(
        "/api/v1/projects",
        headers=user.headers,
        params=params,
    )

    assert response.status_code == 422
