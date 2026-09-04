import asyncio
from datetime import date, datetime, timezone
import json
from types import SimpleNamespace
from typing import cast
from unittest.mock import AsyncMock
from uuid import uuid4

import httpx
from openai import (
    APIConnectionError,
    APITimeoutError,
    AsyncOpenAI,
    AuthenticationError,
    RateLimitError,
)
from pydantic import BaseModel, ValidationError
import pytest

from app.ai.openai_provider import OpenAIProvider
from app.ai.provider import (
    AIProviderAuthenticationError,
    AIProviderRateLimitError,
    AIProviderRefusalError,
    AIProviderResponseError,
    AIProviderTimeoutError,
    AIProviderUnavailableError,
)
from app.ai.schemas import (
    AIGeneratedMilestone,
    AIGeneratedTask,
    AIProjectChangePlanRequest,
    AIProjectContext,
    AIProjectPlanRequest,
    AIProjectPlanningContext,
    AIProjectPlanResponse,
    AIProjectTaskContext,
    AITaskChangeState,
    AIWorkspaceMemberContext,
)
from app.models.task import TaskPriority, TaskStatus


def valid_plan() -> AIProjectPlanResponse:
    return AIProjectPlanResponse(
        summary="A concise launch proposal for review.",
        tasks=[
            AIGeneratedTask(
                title="Define launch scope",
                description="Confirm scope and constraints.",
                priority=TaskPriority.HIGH,
                status=TaskStatus.TODO,
                suggested_due_date=date(2026, 8, 20),
                milestone="Planning",
                order=1,
                depends_on=[],
            ),
            AIGeneratedTask(
                title="Run launch validation",
                description="Validate the release candidate.",
                priority=TaskPriority.URGENT,
                status=TaskStatus.TODO,
                suggested_due_date=date(2026, 8, 30),
                milestone="Launch",
                order=2,
                depends_on=[1],
            ),
        ],
        milestones=[
            AIGeneratedMilestone(
                name="Planning",
                description="Scope is approved.",
                suggested_due_date=date(2026, 8, 20),
                order=1,
            ),
            AIGeneratedMilestone(
                name="Launch",
                description="Release is ready.",
                suggested_due_date=date(2026, 9, 1),
                order=2,
            ),
        ],
        warnings=[],
    )


def project_context() -> AIProjectContext:
    return AIProjectContext(
        id=uuid4(),
        name="API launch",
        description="Prepare the API release.",
        tasks=[
            AIProjectTaskContext(
                id=uuid4(),
                state=AITaskChangeState(
                    title="API authentication",
                    description="Complete the authentication API.",
                    status=TaskStatus.TODO,
                    priority=TaskPriority.MEDIUM,
                    due_date=datetime(2026, 9, 20, 12, tzinfo=timezone.utc),
                ),
                assigned_user_id=uuid4(),
                assigned_user_name="Private member name",
            )
        ],
    )


def provider_with_result(result: object) -> tuple[OpenAIProvider, AsyncMock]:
    parse = AsyncMock(return_value=SimpleNamespace(output_parsed=result, output=[]))
    client = SimpleNamespace(responses=SimpleNamespace(parse=parse))
    provider = OpenAIProvider(
        api_key="tests-only-key",
        model="gpt-5.6-luna",
        client=cast(AsyncOpenAI, client),
    )
    return provider, parse


def test_project_plan_uses_responses_structured_output_without_storage() -> None:
    plan = valid_plan()
    provider, parse = provider_with_result(plan)
    request = AIProjectPlanRequest(
        workspace_id=uuid4(),
        prompt="Prepare a six-week ecommerce launch plan.",
        target_date=date(2026, 9, 1),
    )

    result = asyncio.run(provider.generate_project_plan(request))

    assert result.value == plan
    assert result.usage is None
    assert parse.await_args is not None
    kwargs = parse.await_args.kwargs
    assert kwargs["model"] == "gpt-5.6-luna"
    assert kwargs["text_format"] is AIProjectPlanResponse
    assert kwargs["store"] is False
    assert kwargs["timeout"] == 30.0
    sent = json.loads(kwargs["input"])
    assert sent == {
        "available_members": [],
        "brief": request.prompt,
        "target_date": "2026-09-01",
        "planning_mode": "new_project",
    }
    assert str(request.workspace_id) not in kwargs["input"]
    assert "Never state or imply" in kwargs["instructions"]


def test_project_plan_sends_minimal_member_context_and_accepts_known_assignee() -> None:
    member_id = uuid4()
    context = AIProjectPlanningContext(
        assignable_members=[
            AIWorkspaceMemberContext(
                user_id=member_id,
                display_name="Ada Lovelace",
                role="member",
            )
        ]
    )
    plan = valid_plan()
    plan.tasks[0].suggested_assignee_id = member_id
    provider, parse = provider_with_result(plan)
    request = AIProjectPlanRequest(
        workspace_id=uuid4(),
        prompt="Prepare a six-week ecommerce launch plan.",
    )

    result = asyncio.run(provider.generate_project_plan(request, context))

    assert result.value.tasks[0].suggested_assignee_id == member_id
    assert parse.await_args is not None
    sent = json.loads(parse.await_args.kwargs["input"])
    assert sent["available_members"] == [
        {
            "display_name": "Ada Lovelace",
            "role": "member",
            "user_id": str(member_id),
        }
    ]
    assert "email" not in parse.await_args.kwargs["input"]


def test_project_plan_rejects_an_assignee_outside_supplied_context() -> None:
    plan = valid_plan()
    plan.tasks[0].suggested_assignee_id = uuid4()
    provider, _ = provider_with_result(plan)

    with pytest.raises(AIProviderResponseError):
        asyncio.run(
            provider.generate_project_plan(
                AIProjectPlanRequest(
                    workspace_id=uuid4(),
                    prompt="Prepare a six-week ecommerce launch plan.",
                ),
                AIProjectPlanningContext(assignable_members=[]),
            )
        )


def test_project_plan_returns_provider_token_usage_for_server_metering() -> None:
    plan = valid_plan()
    parse = AsyncMock(
        return_value=SimpleNamespace(
            output_parsed=plan,
            output=[],
            usage=SimpleNamespace(
                input_tokens=321,
                input_tokens_details=SimpleNamespace(
                    cached_tokens=120,
                    cache_write_tokens=80,
                ),
                output_tokens=123,
                total_tokens=444,
            ),
        )
    )
    client = SimpleNamespace(responses=SimpleNamespace(parse=parse))
    provider = OpenAIProvider(
        api_key="tests-only-key",
        model="gpt-5.6-luna",
        client=cast(AsyncOpenAI, client),
    )

    result = asyncio.run(
        provider.generate_project_plan(
            AIProjectPlanRequest(
                workspace_id=uuid4(),
                prompt="Prepare a valid structured project proposal.",
            )
        )
    )

    assert result.usage is not None
    assert result.usage.input_tokens == 321
    assert result.usage.output_tokens == 123
    assert result.usage.total_tokens == 444
    assert result.usage.cached_input_tokens == 120
    assert result.usage.cache_write_input_tokens == 80


def test_project_change_uses_only_safe_context_and_server_owned_identity() -> None:
    context = project_context()
    task = context.tasks[0]
    assert task is not None

    async def parse_response(**kwargs: object) -> object:
        response_model = cast(type[BaseModel], kwargs["text_format"])
        parsed = response_model.model_validate(
            {
                "summary": "One API task should be updated.",
                "changes": [
                    {
                        "task_id": str(task.id),
                        "after": {
                            **task.state.model_dump(mode="json"),
                            "priority": "high",
                        },
                        "reason": "The instruction targets the API task.",
                    }
                ],
                "warnings": [],
            }
        )
        return SimpleNamespace(output_parsed=parsed, output=[])

    parse = AsyncMock(side_effect=parse_response)
    client = SimpleNamespace(responses=SimpleNamespace(parse=parse))
    provider = OpenAIProvider(
        api_key="tests-only-key",
        model="gpt-5.6-luna",
        client=cast(AsyncOpenAI, client),
    )
    request = AIProjectChangePlanRequest(
        workspace_id=uuid4(),
        project_id=context.id,
        instruction="Mets toutes les tâches API en priorité haute.",
    )

    result = asyncio.run(provider.generate_project_change_plan(request, context))

    assert result.value.project_id == context.id
    assert len(result.value.changes) == 1
    change = result.value.changes[0]
    assert change is not None
    assert change.task_id == task.id
    assert change.task_title == task.state.title
    assert change.before == task.state
    assert change.after.priority == TaskPriority.HIGH
    assert change.changed_fields == ["priority"]
    assert parse.await_args is not None
    sent = parse.await_args.kwargs["input"]
    assert str(task.id) in sent
    assert "Private member name" not in sent
    assert str(task.assigned_user_id) not in sent


def test_unknown_task_id_in_change_output_fails_safely() -> None:
    context = project_context()

    async def parse_response(**kwargs: object) -> object:
        response_model = cast(type[BaseModel], kwargs["text_format"])
        parsed = response_model.model_validate(
            {
                "summary": "Unsafe proposal.",
                "changes": [
                    {
                        "task_id": str(uuid4()),
                        "after": context.tasks[0].state.model_dump(mode="json"),
                        "reason": "Unknown task.",
                    }
                ],
                "warnings": [],
            }
        )
        return SimpleNamespace(output_parsed=parsed, output=[])

    parse = AsyncMock(side_effect=parse_response)
    client = SimpleNamespace(responses=SimpleNamespace(parse=parse))
    provider = OpenAIProvider(
        api_key="tests-only-key",
        model="gpt-5.6-luna",
        client=cast(AsyncOpenAI, client),
    )

    with pytest.raises(AIProviderResponseError):
        asyncio.run(
            provider.generate_project_change_plan(
                AIProjectChangePlanRequest(
                    workspace_id=uuid4(),
                    project_id=context.id,
                    instruction="Mets la tâche inconnue en priorité haute.",
                ),
                context,
            )
        )


def test_model_refusal_fails_without_exposing_refusal_content() -> None:
    parse = AsyncMock(
        return_value=SimpleNamespace(
            output_parsed=None,
            output=[
                SimpleNamespace(
                    type="message",
                    content=[SimpleNamespace(type="refusal", refusal="private")],
                )
            ],
        )
    )
    client = SimpleNamespace(responses=SimpleNamespace(parse=parse))
    provider = OpenAIProvider(
        api_key="tests-only-key",
        model="gpt-5.6-luna",
        client=cast(AsyncOpenAI, client),
    )

    with pytest.raises(AIProviderRefusalError) as exc_info:
        asyncio.run(
            provider.generate_project_plan(
                AIProjectPlanRequest(
                    workspace_id=uuid4(),
                    prompt="Prepare a valid structured project proposal.",
                )
            )
        )

    assert "private" not in str(exc_info.value)


def test_invalid_structured_output_fails_safely() -> None:
    with pytest.raises(ValidationError) as validation_error:
        AIProjectPlanResponse.model_validate({"summary": "incomplete"})
    parse = AsyncMock(side_effect=validation_error.value)
    client = SimpleNamespace(responses=SimpleNamespace(parse=parse))
    provider = OpenAIProvider(
        api_key="tests-only-key",
        model="gpt-5.6-luna",
        client=cast(AsyncOpenAI, client),
    )

    with pytest.raises(AIProviderResponseError):
        asyncio.run(
            provider.generate_project_plan(
                AIProjectPlanRequest(
                    workspace_id=uuid4(),
                    prompt="Prepare a valid structured project proposal.",
                )
            )
        )


@pytest.mark.parametrize(
    ("sdk_error", "expected_error"),
    [
        (
            APITimeoutError(httpx.Request("POST", "https://api.openai.com")),
            AIProviderTimeoutError,
        ),
        (
            APIConnectionError(request=httpx.Request("POST", "https://api.openai.com")),
            AIProviderUnavailableError,
        ),
        (
            AuthenticationError(
                "invalid credential",
                response=httpx.Response(
                    401,
                    request=httpx.Request("POST", "https://api.openai.com"),
                ),
                body=None,
            ),
            AIProviderAuthenticationError,
        ),
        (
            RateLimitError(
                "rate limited",
                response=httpx.Response(
                    429,
                    request=httpx.Request("POST", "https://api.openai.com"),
                ),
                body=None,
            ),
            AIProviderRateLimitError,
        ),
    ],
)
def test_provider_errors_are_mapped_to_taskminer_errors(
    sdk_error: Exception,
    expected_error: type[Exception],
) -> None:
    parse = AsyncMock(side_effect=sdk_error)
    client = SimpleNamespace(responses=SimpleNamespace(parse=parse))
    provider = OpenAIProvider(
        api_key="tests-only-key",
        model="gpt-5.6-luna",
        client=cast(AsyncOpenAI, client),
    )

    with pytest.raises(expected_error):
        asyncio.run(
            provider.generate_project_plan(
                AIProjectPlanRequest(
                    workspace_id=uuid4(),
                    prompt="Prepare a valid structured project proposal.",
                )
            )
        )
