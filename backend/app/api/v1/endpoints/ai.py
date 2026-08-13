from fastapi import APIRouter, HTTPException, status

from app.ai.schemas import AIProjectPlanRequest, AIProjectPlanResponse
from app.ai.service import AIProjectNotFoundError
from app.api.deps import AIServiceDep, CurrentUserDep
from app.services.permission import PermissionDeniedError
from app.services.workspace import WorkspaceNotFoundError


router = APIRouter()


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
