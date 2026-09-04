from collections.abc import Generator
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ai.mock_provider import MockAIProvider
from app.ai.provider import (
    AIProviderName,
    AIProviderRateLimitError,
    AIProviderResponseError,
    AIProviderResult,
    AIProviderTimeoutError,
    AIProviderUnavailableError,
    AIProviderUsage,
)
from app.ai.schemas import (
    AIProjectChangePlanRequest,
    AIProjectContext,
    AIProjectPlanRequest,
    AIProjectPlanningContext,
)
from app.api.deps import get_ai_provider_dependency
from app.core.config import settings
from app.main import app
from app.models.ai_usage_event import AIUsageEvent
from app.models.workspace_member import WorkspaceMemberRole
from tests.ai.test_endpoint import plan_payload
from tests.factories import (
    CreatedWorkspace,
    CreatedProject,
    RegisteredUser,
    WorkspaceFactory,
    WorkspaceMemberFactory,
)


class MeteredProvider:
    provider_name: AIProviderName = "openai"
    display_name = "OpenAI"
    model_name = "gpt-5.6-luna"

    def __init__(self) -> None:
        self.call_count = 0

    async def generate_project_plan(
        self,
        request: AIProjectPlanRequest,
        context: AIProjectPlanningContext,
    ) -> AIProviderResult:
        self.call_count += 1
        result = await MockAIProvider().generate_project_plan(request, context)
        return replace(
            result,
            usage=AIProviderUsage(
                input_tokens=1_000,
                output_tokens=500,
                total_tokens=1_500,
                cached_input_tokens=200,
                cache_write_input_tokens=100,
            ),
        )

    async def generate_project_change_plan(
        self,
        request: AIProjectChangePlanRequest,
        context: AIProjectContext,
    ) -> AIProviderResult:
        self.call_count += 1
        result = await MockAIProvider().generate_project_change_plan(request, context)
        return replace(
            result,
            usage=AIProviderUsage(
                input_tokens=1_000,
                output_tokens=500,
                total_tokens=1_500,
                cached_input_tokens=200,
                cache_write_input_tokens=100,
            ),
        )


class FailingMeteredProvider(MeteredProvider):
    def __init__(self, error: Exception) -> None:
        super().__init__()
        self.error = error

    async def generate_project_plan(
        self,
        request: AIProjectPlanRequest,
        context: AIProjectPlanningContext,
    ) -> AIProviderResult:
        del request, context
        self.call_count += 1
        raise self.error


@pytest.fixture
def metered_provider() -> MeteredProvider:
    provider = MeteredProvider()
    app.dependency_overrides[get_ai_provider_dependency] = lambda: provider
    return provider


@pytest.fixture(autouse=True)
def restore_ai_configuration() -> Generator[None, None, None]:
    original = (
        settings.ai_provider,
        settings.openai_model,
        settings.ai_monthly_request_limit,
        settings.ai_rate_limit_requests,
        settings.ai_rate_limit_window_seconds,
    )
    yield
    (
        settings.ai_provider,
        settings.openai_model,
        settings.ai_monthly_request_limit,
        settings.ai_rate_limit_requests,
        settings.ai_rate_limit_window_seconds,
    ) = original
    app.dependency_overrides.pop(get_ai_provider_dependency, None)


def test_success_records_tokens_cost_latency_without_sensitive_content(
    client: TestClient,
    workspace: CreatedWorkspace,
    metered_provider: MeteredProvider,
    database_session: Session,
) -> None:
    del metered_provider
    prompt = "Prepare a sensitive but valid structured launch proposal."

    response = client.post(
        "/api/v1/ai/project-plan",
        headers=workspace.owner.headers,
        json=plan_payload(workspace.id) | {"prompt": prompt},
    )

    assert response.status_code == 200
    event = database_session.scalar(select(AIUsageEvent))
    assert event is not None
    assert event.workspace_id == workspace.id
    assert event.user_id == workspace.owner.id
    assert event.operation_type == "project_plan"
    assert event.provider == "openai"
    assert event.model == "gpt-5.6-luna"
    assert event.status == "success"
    assert event.input_tokens == 1_000
    assert event.output_tokens == 500
    assert event.total_tokens == 1_500
    assert str(event.estimated_cost_usd) == "0.00076900"
    assert event.latency_ms is not None
    assert event.latency_ms >= 0
    assert event.error_code is None
    assert prompt not in repr(event.__dict__)
    assert not hasattr(event, "prompt")
    assert not hasattr(event, "response")


def test_cost_estimation_failure_never_discards_a_successful_generation(
    client: TestClient,
    workspace: CreatedWorkspace,
    metered_provider: MeteredProvider,
    database_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    del metered_provider

    def fail_estimation(*args: object, **kwargs: object) -> None:
        del args, kwargs
        raise ArithmeticError("synthetic pricing failure")

    monkeypatch.setattr(
        "app.ai.cost.AIUsageCostEstimator.estimate",
        fail_estimation,
    )

    response = client.post(
        "/api/v1/ai/project-plan",
        headers=workspace.owner.headers,
        json=plan_payload(workspace.id),
    )

    assert response.status_code == 200
    event = database_session.scalar(select(AIUsageEvent))
    assert event is not None
    assert event.status == "success"
    assert event.estimated_cost_usd is None


def test_success_without_provider_usage_keeps_cost_unknown(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
) -> None:
    app.dependency_overrides[get_ai_provider_dependency] = MockAIProvider

    response = client.post(
        "/api/v1/ai/project-plan",
        headers=workspace.owner.headers,
        json=plan_payload(workspace.id),
    )

    assert response.status_code == 200
    event = database_session.scalar(select(AIUsageEvent))
    assert event is not None
    assert event.status == "success"
    assert event.input_tokens is None
    assert event.output_tokens is None
    assert event.estimated_cost_usd is None


@pytest.mark.parametrize(
    ("provider_error", "expected_status", "expected_code"),
    [
        (AIProviderTimeoutError(), 504, "provider_timeout"),
        (AIProviderRateLimitError(), 503, "provider_rate_limited"),
        (AIProviderUnavailableError(), 503, "provider_unavailable"),
        (AIProviderResponseError(), 502, "invalid_provider_response"),
    ],
)
def test_provider_failure_is_recorded_with_safe_normalized_code(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
    provider_error: Exception,
    expected_status: int,
    expected_code: str,
) -> None:
    provider = FailingMeteredProvider(provider_error)
    app.dependency_overrides[get_ai_provider_dependency] = lambda: provider

    response = client.post(
        "/api/v1/ai/project-plan",
        headers=workspace.owner.headers,
        json=plan_payload(workspace.id),
    )

    assert response.status_code == expected_status
    event = database_session.scalar(select(AIUsageEvent))
    assert event is not None
    assert event.status == "failed"
    assert event.error_code == expected_code
    assert event.latency_ms is not None
    assert event.input_tokens is None
    assert provider.call_count == 1


def test_provider_failure_consumes_one_quota_unit_but_no_local_rejection_event(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
) -> None:
    settings.ai_monthly_request_limit = 1
    provider = FailingMeteredProvider(AIProviderUnavailableError())
    app.dependency_overrides[get_ai_provider_dependency] = lambda: provider

    failed = client.post(
        "/api/v1/ai/project-plan",
        headers=workspace.owner.headers,
        json=plan_payload(workspace.id),
    )
    rejected = client.post(
        "/api/v1/ai/project-plan",
        headers=workspace.owner.headers,
        json=plan_payload(workspace.id),
    )

    assert failed.status_code == 503
    assert rejected.status_code == 429
    assert rejected.json() == {"detail": "AI monthly quota exceeded."}
    assert provider.call_count == 1
    assert database_session.scalar(select(func.count(AIUsageEvent.id))) == 1


def test_monthly_quota_rejects_before_provider_and_does_not_count_rejection(
    client: TestClient,
    workspace: CreatedWorkspace,
    metered_provider: MeteredProvider,
    database_session: Session,
) -> None:
    settings.ai_monthly_request_limit = 1

    first = client.post(
        "/api/v1/ai/project-plan",
        headers=workspace.owner.headers,
        json=plan_payload(workspace.id),
    )
    second = client.post(
        "/api/v1/ai/project-plan",
        headers=workspace.owner.headers,
        json=plan_payload(workspace.id),
    )

    assert first.status_code == 200
    assert second.status_code == 429
    assert second.json() == {"detail": "AI monthly quota exceeded."}
    assert metered_provider.call_count == 1
    assert database_session.scalar(select(func.count(AIUsageEvent.id))) == 1


def test_project_change_analysis_uses_the_same_metering_controls(
    client: TestClient,
    workspace: CreatedWorkspace,
    project: CreatedProject,
    metered_provider: MeteredProvider,
    database_session: Session,
) -> None:
    response = client.post(
        "/api/v1/ai/project-change-plan",
        headers=workspace.owner.headers,
        json={
            "workspace_id": str(workspace.id),
            "project_id": str(project.id),
            "instruction": "Décale toutes les tâches non terminées de trois jours.",
        },
    )

    assert response.status_code == 200
    event = database_session.scalar(select(AIUsageEvent))
    assert event is not None
    assert event.operation_type == "project_change_plan"
    assert event.status == "success"
    assert metered_provider.call_count == 1


def test_quota_is_independent_per_workspace(
    client: TestClient,
    workspace: CreatedWorkspace,
    workspace_factory: WorkspaceFactory,
    metered_provider: MeteredProvider,
) -> None:
    settings.ai_monthly_request_limit = 1
    other_workspace = workspace_factory.create(workspace.owner)

    responses = [
        client.post(
            "/api/v1/ai/project-plan",
            headers=workspace.owner.headers,
            json=plan_payload(workspace_id),
        )
        for workspace_id in (workspace.id, other_workspace.id)
    ]

    assert [response.status_code for response in responses] == [200, 200]
    assert metered_provider.call_count == 2


def test_previous_calendar_month_does_not_consume_current_quota(
    client: TestClient,
    workspace: CreatedWorkspace,
    metered_provider: MeteredProvider,
    database_session: Session,
) -> None:
    settings.ai_monthly_request_limit = 1
    database_session.add(
        AIUsageEvent(
            workspace_id=workspace.id,
            user_id=workspace.owner.id,
            operation_type="project_plan",
            provider="openai",
            model="old-model",
            status="success",
            created_at=datetime(2020, 1, 15, tzinfo=timezone.utc),
        )
    )
    database_session.commit()

    response = client.post(
        "/api/v1/ai/project-plan",
        headers=workspace.owner.headers,
        json=plan_payload(workspace.id),
    )

    assert response.status_code == 200
    assert metered_provider.call_count == 1


def test_rate_limit_returns_retry_after_without_provider_dispatch(
    client: TestClient,
    workspace: CreatedWorkspace,
    metered_provider: MeteredProvider,
    database_session: Session,
) -> None:
    settings.ai_rate_limit_requests = 2
    settings.ai_rate_limit_window_seconds = 60

    responses = [
        client.post(
            "/api/v1/ai/project-plan",
            headers=workspace.owner.headers,
            json=plan_payload(workspace.id),
        )
        for _ in range(3)
    ]

    assert [response.status_code for response in responses] == [200, 200, 429]
    assert responses[-1].json() == {"detail": "AI generation rate limit exceeded."}
    assert 1 <= int(responses[-1].headers["Retry-After"]) <= 60
    assert metered_provider.call_count == 2
    assert database_session.scalar(select(func.count(AIUsageEvent.id))) == 2


def test_expired_rate_window_allows_generation(
    client: TestClient,
    workspace: CreatedWorkspace,
    metered_provider: MeteredProvider,
    database_session: Session,
) -> None:
    settings.ai_rate_limit_requests = 1
    settings.ai_rate_limit_window_seconds = 60
    database_session.add(
        AIUsageEvent(
            workspace_id=workspace.id,
            user_id=workspace.owner.id,
            operation_type="project_plan",
            provider="openai",
            model="old-model",
            status="success",
            created_at=datetime(2020, 1, 15, tzinfo=timezone.utc),
        )
    )
    database_session.commit()

    response = client.post(
        "/api/v1/ai/project-plan",
        headers=workspace.owner.headers,
        json=plan_payload(workspace.id),
    )

    assert response.status_code == 200
    assert metered_provider.call_count == 1


def test_rate_limit_is_scoped_per_user_within_workspace(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    workspace_member_factory: WorkspaceMemberFactory,
    metered_provider: MeteredProvider,
) -> None:
    settings.ai_rate_limit_requests = 1
    workspace_member_factory.create(
        workspace,
        other_user,
        role=WorkspaceMemberRole.MEMBER,
    )

    responses = [
        client.post(
            "/api/v1/ai/project-plan",
            headers=headers,
            json=plan_payload(workspace.id),
        )
        for headers in (workspace.owner.headers, other_user.headers)
    ]

    assert [response.status_code for response in responses] == [200, 200]
    assert metered_provider.call_count == 2


def test_viewer_rejection_does_not_reserve_usage_or_call_provider(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    workspace_member_factory: WorkspaceMemberFactory,
    metered_provider: MeteredProvider,
    database_session: Session,
) -> None:
    workspace_member_factory.create(
        workspace,
        other_user,
        role=WorkspaceMemberRole.VIEWER,
    )

    response = client.post(
        "/api/v1/ai/project-plan",
        headers=other_user.headers,
        json=plan_payload(workspace.id),
    )

    assert response.status_code == 403
    assert metered_provider.call_count == 0
    assert database_session.scalar(select(func.count(AIUsageEvent.id))) == 0


def test_concurrent_requests_cannot_exceed_last_workspace_unit(
    client: TestClient,
    workspace: CreatedWorkspace,
    metered_provider: MeteredProvider,
    database_session: Session,
) -> None:
    settings.ai_monthly_request_limit = 1
    settings.ai_rate_limit_requests = 10

    def generate() -> int:
        return client.post(
            "/api/v1/ai/project-plan",
            headers=workspace.owner.headers,
            json=plan_payload(workspace.id),
        ).status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        statuses = list(executor.map(lambda _: generate(), range(2)))

    assert sorted(statuses) == [200, 429]
    assert metered_provider.call_count == 1
    assert database_session.scalar(select(func.count(AIUsageEvent.id))) == 1


def test_usage_endpoint_is_available_to_owner_and_admin(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    workspace_member_factory: WorkspaceMemberFactory,
    metered_provider: MeteredProvider,
) -> None:
    del metered_provider
    settings.ai_provider = "openai"
    settings.openai_model = "gpt-5.6-luna"
    workspace_member_factory.create(
        workspace,
        other_user,
        role=WorkspaceMemberRole.ADMIN,
    )
    generated = client.post(
        "/api/v1/ai/project-plan",
        headers=workspace.owner.headers,
        json=plan_payload(workspace.id),
    )
    assert generated.status_code == 200

    for headers in (workspace.owner.headers, other_user.headers):
        response = client.get(
            f"/api/v1/workspaces/{workspace.id}/ai/usage",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["request_limit"] == settings.ai_monthly_request_limit
        assert data["requests_used"] == 1
        assert data["requests_remaining"] == settings.ai_monthly_request_limit - 1
        assert data["successful_requests"] == 1
        assert data["failed_requests"] == 0
        assert data["input_tokens"] == 1_000
        assert data["output_tokens"] == 500
        assert data["total_tokens"] == 1_500
        assert data["estimated_cost_usd"] == 0.000769
        assert data["pricing_configured"] is True
        assert data["average_latency_ms"] is not None


def test_usage_endpoint_reports_unknown_pricing_for_unrecognized_model(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    settings.ai_provider = "openai"
    settings.openai_model = "unrecognized-model"

    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/ai/usage",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 200
    assert response.json()["pricing_configured"] is False


def test_monthly_usage_aggregation_isolated_by_workspace_and_period(
    client: TestClient,
    workspace: CreatedWorkspace,
    workspace_factory: WorkspaceFactory,
    database_session: Session,
) -> None:
    settings.ai_provider = "openai"
    settings.openai_model = "gpt-5.6-luna"
    other_workspace = workspace_factory.create(workspace.owner)
    now = datetime.now(timezone.utc)
    current_events = [
        AIUsageEvent(
            workspace_id=workspace.id,
            user_id=workspace.owner.id,
            operation_type="project_plan",
            provider="openai",
            model="gpt-5.6-luna",
            status="success",
            input_tokens=100,
            output_tokens=50,
            total_tokens=150,
            estimated_cost_usd=Decimal("0.00008000"),
            latency_ms=100,
            created_at=now,
        ),
        AIUsageEvent(
            workspace_id=workspace.id,
            user_id=workspace.owner.id,
            operation_type="project_plan",
            provider="openai",
            model="gpt-5.6-luna",
            status="failed",
            latency_ms=300,
            error_code="provider_unavailable",
            created_at=now,
        ),
    ]
    excluded_events = [
        AIUsageEvent(
            workspace_id=other_workspace.id,
            user_id=workspace.owner.id,
            operation_type="project_plan",
            provider="openai",
            model="gpt-5.6-luna",
            status="success",
            estimated_cost_usd=Decimal("99.00000000"),
            created_at=now,
        ),
        AIUsageEvent(
            workspace_id=workspace.id,
            user_id=workspace.owner.id,
            operation_type="project_plan",
            provider="openai",
            model="gpt-5.6-luna",
            status="success",
            estimated_cost_usd=Decimal("99.00000000"),
            created_at=now - timedelta(days=40),
        ),
    ]
    database_session.add_all([*current_events, *excluded_events])
    database_session.commit()

    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/ai/usage",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["requests_used"] == 2
    assert data["successful_requests"] == 1
    assert data["failed_requests"] == 1
    assert data["input_tokens"] == 100
    assert data["output_tokens"] == 50
    assert data["total_tokens"] == 150
    assert data["estimated_cost_usd"] == 0.00008
    assert data["average_latency_ms"] == 200


@pytest.mark.parametrize(
    "role",
    [WorkspaceMemberRole.MEMBER, WorkspaceMemberRole.VIEWER],
)
def test_usage_endpoint_denies_non_administrative_members(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    workspace_member_factory: WorkspaceMemberFactory,
    role: WorkspaceMemberRole,
) -> None:
    workspace_member_factory.create(workspace, other_user, role=role)

    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/ai/usage",
        headers=other_user.headers,
    )

    assert response.status_code == 403


def test_usage_endpoint_hides_workspace_from_outsider(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
) -> None:
    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/ai/usage",
        headers=other_user.headers,
    )

    assert response.status_code == 404
