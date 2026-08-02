from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CurrentUserDep, DashboardServiceDep
from app.schemas.dashboard import (
    DashboardFilters,
    DashboardPeriod,
    DashboardProjectListParams,
    DashboardRead,
    DashboardRecentProjectPage,
)


router = APIRouter()


@router.get("/projects", response_model=DashboardRecentProjectPage)
def list_dashboard_projects(
    current_user: CurrentUserDep,
    service: DashboardServiceDep,
    params: Annotated[DashboardProjectListParams, Query()],
) -> DashboardRecentProjectPage:
    return service.list_projects(current_user, params)


@router.get("", response_model=DashboardRead)
def get_dashboard(
    current_user: CurrentUserDep,
    service: DashboardServiceDep,
    workspace_id: Annotated[UUID | None, Query()] = None,
    project_id: Annotated[UUID | None, Query()] = None,
    user_id: Annotated[UUID | None, Query()] = None,
    period: Annotated[DashboardPeriod, Query()] = DashboardPeriod.DAYS_30,
    activity_limit: Annotated[int, Query(ge=1, le=20)] = 8,
) -> DashboardRead:
    return service.get_dashboard(
        current_user,
        DashboardFilters(
            workspace_id=workspace_id,
            project_id=project_id,
            user_id=user_id,
            period=period,
            activity_limit=activity_limit,
        ),
    )
