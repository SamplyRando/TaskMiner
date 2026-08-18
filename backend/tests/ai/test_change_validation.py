from uuid import uuid4

from fastapi.testclient import TestClient
from pydantic import ValidationError
import pytest

from app.ai.schemas import AIProjectChangePlanRequest
from tests.factories import CreatedWorkspace


def test_change_instruction_is_trimmed() -> None:
    request = AIProjectChangePlanRequest(
        workspace_id=uuid4(),
        project_id=uuid4(),
        instruction="   Décale toutes les tâches de trois jours.   ",
    )

    assert request.instruction == "Décale toutes les tâches de trois jours."


@pytest.mark.parametrize("instruction", ["", "        ", "court", "x" * 5_001])
def test_change_instruction_validation(instruction: str) -> None:
    with pytest.raises(ValidationError):
        AIProjectChangePlanRequest(
            workspace_id=uuid4(),
            project_id=uuid4(),
            instruction=instruction,
        )


def test_change_generation_forbids_extra_fields(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    response = client.post(
        "/api/v1/ai/project-change-plan",
        headers=workspace.owner.headers,
        json={
            "workspace_id": str(workspace.id),
            "project_id": str(uuid4()),
            "instruction": "Décale toutes les tâches de trois jours.",
            "actor_id": str(workspace.owner.id),
        },
    )

    assert response.status_code == 422
