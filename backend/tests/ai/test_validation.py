from datetime import date
from uuid import uuid4

from fastapi.testclient import TestClient
from pydantic import ValidationError
import pytest

from app.ai.schemas import AIProjectPlanRequest
from tests.factories import CreatedWorkspace


def test_request_trims_prompt() -> None:
    request = AIProjectPlanRequest(
        workspace_id=uuid4(),
        prompt="   A meaningful project planning brief.   ",
    )

    assert request.prompt == "A meaningful project planning brief."


@pytest.mark.parametrize("prompt", ["", "         ", "too short"])
def test_request_rejects_a_prompt_without_meaningful_length(prompt: str) -> None:
    with pytest.raises(ValidationError):
        AIProjectPlanRequest(workspace_id=uuid4(), prompt=prompt)


def test_request_rejects_a_prompt_over_the_limit() -> None:
    with pytest.raises(ValidationError):
        AIProjectPlanRequest(workspace_id=uuid4(), prompt="a" * 5_001)


def test_optional_project_and_target_date_default_to_none() -> None:
    request = AIProjectPlanRequest(
        workspace_id=uuid4(),
        prompt="Create a structured project delivery plan.",
    )

    assert request.project_id is None
    assert request.target_date is None


def test_optional_project_and_target_date_are_accepted() -> None:
    project_id = uuid4()
    request = AIProjectPlanRequest(
        workspace_id=uuid4(),
        project_id=project_id,
        prompt="Create a structured project delivery plan.",
        target_date=date(2026, 9, 1),
    )

    assert request.project_id == project_id
    assert request.target_date == date(2026, 9, 1)


@pytest.mark.parametrize(
    ("payload", "expected_location"),
    [
        ({"prompt": "A valid project planning brief."}, "workspace_id"),
        ({"workspace_id": "invalid", "prompt": "A valid brief."}, "workspace_id"),
        (
            {
                "workspace_id": str(uuid4()),
                "project_id": "invalid",
                "prompt": "A valid project planning brief.",
            },
            "project_id",
        ),
        (
            {
                "workspace_id": str(uuid4()),
                "prompt": "A valid project planning brief.",
                "target_date": "not-a-date",
            },
            "target_date",
        ),
    ],
)
def test_endpoint_rejects_invalid_request_fields(
    client: TestClient,
    workspace: CreatedWorkspace,
    payload: dict[str, str],
    expected_location: str,
) -> None:
    response = client.post(
        "/api/v1/ai/project-plan",
        headers=workspace.owner.headers,
        json=payload,
    )

    assert response.status_code == 422
    assert any(
        item["loc"][-1] == expected_location for item in response.json()["detail"]
    )


def test_endpoint_rejects_client_supplied_user_fields(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    response = client.post(
        "/api/v1/ai/project-plan",
        headers=workspace.owner.headers,
        json={
            "workspace_id": str(workspace.id),
            "prompt": "Create a structured project delivery plan.",
            "owner_id": str(workspace.owner.id),
        },
    )

    assert response.status_code == 422
