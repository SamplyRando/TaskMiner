from fastapi import APIRouter, HTTPException, status

from app.ai.apply_service import (
    AIApplyAssigneeNotFoundError,
    AIApplyProjectNotFoundError,
    AIIdempotencyConflictError,
)
from app.ai.schemas import (
    AIApplyProjectPlanRequest,
    AIApplyProjectPlanResponse,
    AIProjectPlanRequest,
    AIProjectPlanResponse,
)
from app.ai.service import AIProjectNotFoundError
from app.api.deps import AIApplyServiceDep, AIServiceDep, CurrentUserDep
from app.services.permission import PermissionDeniedError
from app.services.workspace import WorkspaceNotFoundError


router = APIRouter()


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
