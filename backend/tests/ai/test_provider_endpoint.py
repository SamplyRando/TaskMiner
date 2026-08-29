from collections.abc import Generator

from fastapi.testclient import TestClient
import pytest

from app.ai.provider import (
    AIProviderName,
    AIProviderRefusalError,
    AIProviderTimeoutError,
)
from app.api.deps import get_ai_provider_dependency
from app.main import app
from tests.factories import CreatedWorkspace


class FailingProvider:
    provider_name: AIProviderName = "openai"
    display_name = "OpenAI"
    model_name = "test-model"

    def __init__(self, error: Exception) -> None:
        self.error = error

    async def generate_project_plan(self, *args: object) -> object:
        raise self.error

    async def generate_project_change_plan(self, *args: object) -> object:
        raise self.error


@pytest.fixture
def override_provider() -> Generator[None, None, None]:
    yield
    app.dependency_overrides.pop(get_ai_provider_dependency, None)


def test_capabilities_require_authentication(client: TestClient) -> None:
    response = client.get("/api/v1/ai/capabilities")

    assert response.status_code == 401


def test_capabilities_expose_safe_default_provider_metadata(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    response = client.get(
        "/api/v1/ai/capabilities",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 200
    assert response.json() == {
        "project_planning": True,
        "project_editing": True,
        "provider": "mock",
        "provider_label": "Mock provider",
    }


@pytest.mark.parametrize(
    ("error", "expected_status", "expected_detail"),
    [
        (
            AIProviderTimeoutError(),
            504,
            "TaskMiner AI took too long to respond. Please try again.",
        ),
        (
            AIProviderRefusalError(),
            502,
            (
                "TaskMiner AI could not produce a valid proposal. "
                "Please revise your request."
            ),
        ),
    ],
)
def test_provider_failures_return_stable_api_errors(
    client: TestClient,
    workspace: CreatedWorkspace,
    override_provider: None,
    error: Exception,
    expected_status: int,
    expected_detail: str,
) -> None:
    del override_provider
    app.dependency_overrides[get_ai_provider_dependency] = lambda: FailingProvider(
        error
    )

    response = client.post(
        "/api/v1/ai/project-plan",
        headers=workspace.owner.headers,
        json={
            "workspace_id": str(workspace.id),
            "project_id": None,
            "prompt": "Prepare a valid structured project proposal.",
            "target_date": None,
        },
    )

    assert response.status_code == expected_status
    assert response.json() == {"detail": expected_detail}
    assert "openai" not in response.text.casefold()
