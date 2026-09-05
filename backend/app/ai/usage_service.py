from collections.abc import Awaitable, Callable
from datetime import datetime, timedelta, timezone
import logging
from math import ceil
from time import monotonic
from typing import Literal, TypeVar
from uuid import UUID

from app.ai.cost import AIUsageCostEstimator
from app.ai.provider import (
    AIProvider,
    AIProviderAuthenticationError,
    AIProviderError,
    AIProviderRateLimitError,
    AIProviderRefusalError,
    AIProviderResponseError,
    AIProviderResult,
    AIProviderTimeoutError,
    AIProviderUnavailableError,
)
from app.ai.schemas import AIWorkspaceUsageResponse
from app.models.user import User
from app.repositories.ai_usage import AIUsageRepository
from app.services.permission import PermissionService
from app.services.subscription import PlanLimitExceededError, SubscriptionService
from app.subscriptions.plans import PlanCode


logger = logging.getLogger(__name__)

AIUsageOperation = Literal["project_plan", "project_change_plan"]
GenerationT = TypeVar("GenerationT")


class AIMonthlyQuotaExceededError(PlanLimitExceededError):
    """Raised before provider dispatch when the workspace quota is exhausted."""

    def __init__(self, plan: PlanCode, limit: int) -> None:
        super().__init__(
            "ai_quota_reached",
            plan,
            limit,
            "AI request",
        )


class AIRateLimitExceededError(Exception):
    """Raised before provider dispatch when a user generation window is full."""

    def __init__(self, retry_after_seconds: int) -> None:
        super().__init__()
        self.retry_after_seconds = retry_after_seconds


def utc_month_bounds(now: datetime) -> tuple[datetime, datetime]:
    start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    if now.month == 12:
        end = datetime(now.year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(now.year, now.month + 1, 1, tzinfo=timezone.utc)
    return start, end


class AIUsageService:
    """Reserve, meter, and report provider-bound AI generation requests."""

    def __init__(
        self,
        repository: AIUsageRepository,
        permission_service: PermissionService,
        cost_estimator: AIUsageCostEstimator,
        subscription_service: SubscriptionService,
        *,
        rate_limit_requests: int,
        rate_limit_window_seconds: int,
        pricing_model: str | None,
        clock: Callable[[], datetime] | None = None,
    ) -> None:
        self.repository = repository
        self.permission_service = permission_service
        self.cost_estimator = cost_estimator
        self.subscription_service = subscription_service
        self.rate_limit_requests = rate_limit_requests
        self.rate_limit_window_seconds = rate_limit_window_seconds
        self.pricing_model = pricing_model
        self.clock = clock or (lambda: datetime.now(timezone.utc))

    async def run_generation(
        self,
        *,
        user: User,
        workspace_id: UUID,
        operation_type: AIUsageOperation,
        provider: AIProvider,
        generate: Callable[[], Awaitable[AIProviderResult[GenerationT]]],
    ) -> GenerationT:
        event_id = self._reserve(
            user=user,
            workspace_id=workspace_id,
            operation_type=operation_type,
            provider=provider,
        )
        started = monotonic()
        try:
            result = await generate()
        except AIProviderError as error:
            latency_ms = self._latency_ms(started)
            error_code = self._provider_error_code(error)
            self._complete_failure(event_id, latency_ms, error_code)
            self._log_event(
                workspace_id=workspace_id,
                operation_type=operation_type,
                provider=provider,
                status="failed",
                latency_ms=latency_ms,
                error_code=error_code,
            )
            raise
        except Exception as error:
            latency_ms = self._latency_ms(started)
            error_code = "unknown_provider_error"
            self._complete_failure(event_id, latency_ms, error_code)
            self._log_event(
                workspace_id=workspace_id,
                operation_type=operation_type,
                provider=provider,
                status="failed",
                latency_ms=latency_ms,
                error_code=error_code,
            )
            raise AIProviderUnavailableError from error

        latency_ms = self._latency_ms(started)
        usage = result.usage
        input_tokens = usage.input_tokens if usage is not None else None
        output_tokens = usage.output_tokens if usage is not None else None
        total_tokens = usage.total_tokens if usage is not None else None
        try:
            estimated_cost = self.cost_estimator.estimate(provider.model_name, usage)
        except Exception:
            logger.warning(
                "ai_cost_estimation_unavailable workspace_id=%s "
                "operation_type=%s provider=%s model=%s",
                workspace_id,
                operation_type,
                provider.provider_name,
                provider.model_name,
            )
            estimated_cost = None
        event = self.repository.get(event_id)
        if event is None:
            raise RuntimeError("AI usage reservation is missing.")
        self.repository.complete_success(
            event,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
            estimated_cost_usd=estimated_cost,
            latency_ms=latency_ms,
        )
        self.repository.commit()
        self._log_event(
            workspace_id=workspace_id,
            operation_type=operation_type,
            provider=provider,
            status="success",
            latency_ms=latency_ms,
            error_code=None,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
        )
        return result.value

    def get_workspace_usage(
        self,
        user: User,
        workspace_id: UUID,
    ) -> AIWorkspaceUsageResponse:
        self.permission_service.require_ai_usage_view(user, workspace_id)
        period_start, period_end = utc_month_bounds(
            self.clock().astimezone(timezone.utc)
        )
        aggregate = self.repository.aggregate(
            workspace_id,
            period_start,
            period_end,
        )
        _, request_limit = self.subscription_service.get_ai_request_limit(workspace_id)
        return AIWorkspaceUsageResponse(
            period_start=period_start,
            period_end=period_end,
            request_limit=request_limit,
            requests_used=aggregate.requests_used,
            requests_remaining=max(
                request_limit - aggregate.requests_used,
                0,
            ),
            successful_requests=aggregate.successful_requests,
            failed_requests=aggregate.failed_requests,
            input_tokens=aggregate.input_tokens,
            output_tokens=aggregate.output_tokens,
            total_tokens=aggregate.total_tokens,
            estimated_cost_usd=float(aggregate.estimated_cost_usd),
            pricing_configured=self.cost_estimator.has_pricing(self.pricing_model),
            average_latency_ms=aggregate.average_latency_ms,
        )

    def _reserve(
        self,
        *,
        user: User,
        workspace_id: UUID,
        operation_type: AIUsageOperation,
        provider: AIProvider,
    ) -> UUID:
        now = self.clock().astimezone(timezone.utc)
        period_start, period_end = utc_month_bounds(now)
        window_start = now - timedelta(seconds=self.rate_limit_window_seconds)
        try:
            self.repository.lock_workspace(workspace_id)
            plan, request_limit = self.subscription_service.get_ai_request_limit(
                workspace_id
            )
            usage_count = self.repository.count_workspace_requests(
                workspace_id,
                period_start,
                period_end,
            )
            if usage_count >= request_limit:
                raise AIMonthlyQuotaExceededError(plan, request_limit)

            rate_count = self.repository.count_user_requests_since(
                workspace_id,
                user.id,
                window_start,
            )
            if rate_count >= self.rate_limit_requests:
                oldest = self.repository.oldest_user_request_since(
                    workspace_id,
                    user.id,
                    window_start,
                )
                retry_after = self.rate_limit_window_seconds
                if oldest is not None:
                    retry_after = max(
                        1,
                        ceil(
                            (
                                oldest
                                + timedelta(seconds=self.rate_limit_window_seconds)
                                - now
                            ).total_seconds()
                        ),
                    )
                raise AIRateLimitExceededError(retry_after)

            event = self.repository.create_started(
                workspace_id=workspace_id,
                user_id=user.id,
                operation_type=operation_type,
                provider=provider.provider_name,
                model=provider.model_name,
                created_at=now,
            )
            self.repository.commit()
            return event.id
        except (AIMonthlyQuotaExceededError, AIRateLimitExceededError):
            self.repository.rollback()
            raise

    def _complete_failure(
        self,
        event_id: UUID,
        latency_ms: int,
        error_code: str,
    ) -> None:
        event = self.repository.get(event_id)
        if event is None:
            raise RuntimeError("AI usage reservation is missing.")
        self.repository.complete_failure(
            event,
            latency_ms=latency_ms,
            error_code=error_code,
        )
        self.repository.commit()

    @staticmethod
    def _latency_ms(started: float) -> int:
        return max(0, int(round((monotonic() - started) * 1_000)))

    @staticmethod
    def _provider_error_code(error: AIProviderError) -> str:
        if isinstance(error, AIProviderTimeoutError):
            return "provider_timeout"
        if isinstance(error, AIProviderRateLimitError):
            return "provider_rate_limited"
        if isinstance(error, (AIProviderResponseError, AIProviderRefusalError)):
            return "invalid_provider_response"
        if isinstance(
            error,
            (AIProviderUnavailableError, AIProviderAuthenticationError),
        ):
            return "provider_unavailable"
        return "unknown_provider_error"

    @staticmethod
    def _log_event(
        *,
        workspace_id: UUID,
        operation_type: str,
        provider: AIProvider,
        status: str,
        latency_ms: int,
        error_code: str | None,
        input_tokens: int | None = None,
        output_tokens: int | None = None,
        total_tokens: int | None = None,
    ) -> None:
        logger.info(
            "ai_generation workspace_id=%s operation_type=%s provider=%s "
            "model=%s status=%s latency_ms=%s input_tokens=%s output_tokens=%s "
            "total_tokens=%s error_code=%s",
            workspace_id,
            operation_type,
            provider.provider_name,
            provider.model_name,
            status,
            latency_ms,
            input_tokens,
            output_tokens,
            total_tokens,
            error_code,
        )
