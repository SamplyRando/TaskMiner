from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.ai.apply_service import (
    AIApplyAssigneeNotFoundError,
    AIApplyProjectNotFoundError,
    AIIdempotencyConflictError,
)
from app.ai.change_apply_service import (
    AIProjectChangeConflictError,
    AIProjectChangeTaskNotFoundError,
)
from app.ai.provider import (
    AIProviderAuthenticationError,
    AIProviderError,
    AIProviderRateLimitError,
    AIProviderRefusalError,
    AIProviderResponseError,
    AIProviderTimeoutError,
)
from app.ai.schemas import (
    AICapabilitiesResponse,
    AIApplyProjectChangePlanRequest,
    AIApplyProjectChangePlanResponse,
    AIApplyProjectPlanRequest,
    AIApplyProjectPlanResponse,
    AIProjectChangePlanRequest,
    AIProjectChangePlanResponse,
    AIProjectPlanRequest,
    AIProjectPlanResponse,
    AIWorkspaceUsageResponse,
)
from app.ai.service import AIProjectNotFoundError
from app.ai.usage_service import (
    AIMonthlyQuotaExceededError,
    AIRateLimitExceededError,
)
from app.api.deps import (
    AIApplyServiceDep,
    AIProjectChangeApplyServiceDep,
    AIProjectChangePlanServiceDep,
    AIProviderDep,
    AIServiceDep,
    AIUsageServiceDep,
    CurrentUserDep,
)
from app.services.permission import PermissionDeniedError
from app.services.subscription import PlanLimitExceededError
from app.services.workspace import WorkspaceNotFoundError


router = APIRouter()
usage_router = APIRouter()


def _usage_limit_http_exception(
    error: AIMonthlyQuotaExceededError | AIRateLimitExceededError,
) -> HTTPException:
    if isinstance(error, AIRateLimitExceededError):
        return HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI generation rate limit exceeded.",
            headers={"Retry-After": str(error.retry_after_seconds)},
        )
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=error.as_detail(),
    )


def _provider_http_exception(error: AIProviderError) -> HTTPException:
    if isinstance(error, AIProviderTimeoutError):
        return HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="TaskMiner AI took too long to respond. Please try again.",
        )
    if isinstance(
        error,
        (
            AIProviderAuthenticationError,
            AIProviderRateLimitError,
        ),
    ):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="TaskMiner AI is temporarily unavailable. Please try again.",
        )
    if isinstance(error, (AIProviderRefusalError, AIProviderResponseError)):
        return HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "TaskMiner AI could not produce a valid proposal. "
                "Please revise your request."
            ),
        )
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="TaskMiner AI is temporarily unavailable. Please try again.",
    )


@router.get("/capabilities", response_model=AICapabilitiesResponse)
def get_ai_capabilities(
    current_user: CurrentUserDep,
    provider: AIProviderDep,
) -> AICapabilitiesResponse:
    del current_user
    return AICapabilitiesResponse(
        provider=provider.provider_name,
        provider_label=provider.display_name,
    )


@router.post(
    "/project-change-plan/apply",
    response_model=AIApplyProjectChangePlanResponse,
)
def apply_project_change_plan(
    data: AIApplyProjectChangePlanRequest,
    current_user: CurrentUserDep,
    service: AIProjectChangeApplyServiceDep,
) -> AIApplyProjectChangePlanResponse:
    try:
        return service.apply_project_change_plan(current_user, data)
    except WorkspaceNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found.",
        ) from exc
    except AIProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        ) from exc
    except AIProjectChangeTaskNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        ) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions.",
        ) from exc
    except AIProjectChangeConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "AI_CHANGE_CONFLICT",
                "conflicts": [
                    conflict.model_dump(mode="json") for conflict in exc.conflicts
                ],
            },
        ) from exc
    except AIIdempotencyConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Idempotency key already used with another payload.",
        ) from exc


@router.post(
    "/project-change-plan",
    response_model=AIProjectChangePlanResponse,
)
async def generate_project_change_plan(
    data: AIProjectChangePlanRequest,
    current_user: CurrentUserDep,
    service: AIProjectChangePlanServiceDep,
) -> AIProjectChangePlanResponse:
    try:
        return await service.generate_project_change_plan(current_user, data)
    except WorkspaceNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found.",
        ) from exc
    except AIProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        ) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions.",
        ) from exc
    except (AIMonthlyQuotaExceededError, AIRateLimitExceededError) as exc:
        raise _usage_limit_http_exception(exc) from exc
    except AIProviderError as exc:
        raise _provider_http_exception(exc) from exc


@router.post(
    "/project-plan/apply",
    response_model=AIApplyProjectPlanResponse,
)
def apply_project_plan(
    data: AIApplyProjectPlanRequest,
    current_user: CurrentUserDep,
    service: AIApplyServiceDep,
) -> AIApplyProjectPlanResponse:
    try:
        return service.apply_project_plan(current_user, data)
    except WorkspaceNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found.",
        ) from exc
    except AIApplyProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        ) from exc
    except AIApplyAssigneeNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignee not found.",
        ) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions.",
        ) from exc
    except AIIdempotencyConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Idempotency key already used with another payload.",
        ) from exc
    except PlanLimitExceededError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=exc.as_detail(),
        ) from exc


@router.post("/project-plan", response_model=AIProjectPlanResponse)
async def generate_project_plan(
    data: AIProjectPlanRequest,
    current_user: CurrentUserDep,
    service: AIServiceDep,
) -> AIProjectPlanResponse:
    try:
        return await service.generate_project_plan(current_user, data)
    except WorkspaceNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found.",
        ) from exc
    except AIProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        ) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions.",
        ) from exc
    except (AIMonthlyQuotaExceededError, AIRateLimitExceededError) as exc:
        raise _usage_limit_http_exception(exc) from exc
    except AIProviderError as exc:
        raise _provider_http_exception(exc) from exc


@usage_router.get(
    "/{workspace_id}/ai/usage",
    response_model=AIWorkspaceUsageResponse,
)
def get_workspace_ai_usage(
    workspace_id: UUID,
    current_user: CurrentUserDep,
    service: AIUsageServiceDep,
) -> AIWorkspaceUsageResponse:
    try:
        return service.get_workspace_usage(current_user, workspace_id)
    except WorkspaceNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found.",
        ) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions.",
        ) from exc
