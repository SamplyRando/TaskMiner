from uuid import UUID

from app.models.user import User
from app.repositories.activity import ActivityRepository
from app.schemas.activity import ActivityFeed, ActivityListParams, ActivityRead
from app.services.permission import PermissionService


class ActivityService:
    """Application service for read-only workspace activity feeds."""

    def __init__(
        self,
        repository: ActivityRepository,
        permission_service: PermissionService,
    ) -> None:
        self.repository = repository
        self.permission_service = permission_service

    def list_workspace_feed(
        self,
        user: User,
        workspace_id: UUID,
        params: ActivityListParams,
    ) -> ActivityFeed:
        workspace = self.permission_service.require_workspace_view(
            user,
            workspace_id,
        )
        activities, count = self.repository.list_workspace_feed(
            workspace,
            offset=params.offset,
            limit=params.limit,
        )
        return ActivityFeed(
            items=[ActivityRead.model_validate(activity) for activity in activities],
            count=count,
        )
