import asyncio
from datetime import date
from uuid import uuid4

from app.ai.mock_provider import MockAIProvider
from app.ai.schemas import AIProjectPlanRequest
from app.models.task import TaskPriority


def build_request(**overrides: object) -> AIProjectPlanRequest:
    values: dict[str, object] = {
        "workspace_id": uuid4(),
        "prompt": "Prepare the launch of our mobile application before September.",
    }
    values.update(overrides)
    return AIProjectPlanRequest.model_validate(values)


def generate(request: AIProjectPlanRequest):
    return asyncio.run(MockAIProvider().generate_project_plan(request))


def test_mock_provider_is_deterministic() -> None:
    request = build_request(target_date=date(2026, 9, 1))

    first = generate(request)
    second = generate(request)

    assert first == second
    assert first.model_dump() == second.model_dump()


def test_mock_provider_returns_valid_priorities_and_stable_ordering() -> None:
    response = generate(build_request())

    assert [task.order for task in response.tasks] == list(
        range(1, len(response.tasks) + 1)
    )
    assert [milestone.order for milestone in response.milestones] == [1, 2, 3]
    assert {task.priority for task in response.tasks} <= set(TaskPriority)
    assert response.tasks[0].title == "Define launch scope"
    assert response.tasks[-1].title == "Publish release"
    assert response.warnings == [
        "No target date was provided; suggested due dates are omitted."
    ]


def test_mock_provider_calculates_dates_from_target_date() -> None:
    target_date = date(2026, 9, 1)

    response = generate(build_request(target_date=target_date))

    assert response.tasks[0].suggested_due_date == date(2026, 8, 18)
    assert response.tasks[-1].suggested_due_date == target_date
    assert response.milestones[-1].suggested_due_date == target_date
    assert response.warnings == []


def test_mock_provider_supports_a_general_project_brief() -> None:
    response = generate(
        build_request(prompt="Organize our customer onboarding process and handoff.")
    )

    assert response.tasks[0].title == "Clarify project scope"
    assert response.tasks[-1].title == "Complete project handoff"
    assert "starting plan" in response.summary
