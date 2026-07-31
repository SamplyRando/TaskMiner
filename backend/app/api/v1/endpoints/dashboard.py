from fastapi import APIRouter

from app.api.deps import CurrentUserDep, DashboardServiceDep
from app.schemas.dashboard import DashboardRead


router = APIRouter()


@router.get("", response_model=DashboardRead)
def get_dashboard(
    current_user: CurrentUserDep,
    service: DashboardServiceDep,
) -> DashboardRead:
    return service.get_dashboard(current_user)
