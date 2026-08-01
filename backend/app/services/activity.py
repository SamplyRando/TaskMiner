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
            params=params,
        )
        return ActivityFeed(
            items=[ActivityRead.from_activity(activity) for activity in activities],
            count=count,
        )

    def prepare_stream(
        self,
        user: User,
        workspace_id: UUID,
        last_event_id: UUID | None,
    ) -> list[ActivityRead]:
        workspace = self.permission_service.require_workspace_view(
            user,
            workspace_id,
        )
        if last_event_id is None:
            return []
        return [
            ActivityRead.from_activity(activity)
            for activity in self.repository.list_after(
                workspace,
                last_event_id,
            )
        ]
