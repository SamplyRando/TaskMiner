from datetime import datetime, timezone
from collections.abc import Callable
from typing import Literal
from uuid import UUID

from app.models.user import User
from app.models.workspace_subscription import WorkspaceSubscription
from app.repositories.ai_usage import AIUsageRepository
from app.repositories.subscription import WorkspaceSubscriptionRepository
from app.schemas.subscription import (
    WorkspacePlanLimitsRead,
    WorkspacePlanUsageRead,
    WorkspaceSubscriptionRead,
)
from app.services.permission import PermissionService
from app.subscriptions.plans import (
    ENTITLEMENT_STATUSES,
    PLAN_LIMITS,
    PlanCode,
    PlanLimits,
    SubscriptionStatus,
)


PlanLimitCode = Literal[
    "workspace_limit_reached",
    "member_limit_reached",
    "project_limit_reached",
    "ai_quota_reached",
]


class PlanLimitExceededError(Exception):
    """A stable domain error raised before a plan-limited mutation."""

    def __init__(
        self,
        code: PlanLimitCode,
        plan: PlanCode,
        limit: int,
        resource_label: str,
    ) -> None:
        self.code = code
        self.plan = plan
        self.limit = limit
        self.message = (
            f"{resource_label} limit reached for the {plan.value.title()} plan."
        )
        super().__init__(self.message)

    def as_detail(self) -> dict[str, str | int]:
        return {
            "code": self.code,
            "message": self.message,
            "plan": self.plan.value,
            "limit": self.limit,
        }


def utc_month_bounds(now: datetime) -> tuple[datetime, datetime]:
    start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    if now.month == 12:
        return start, datetime(now.year + 1, 1, 1, tzinfo=timezone.utc)
    return start, datetime(now.year, now.month + 1, 1, tzinfo=timezone.utc)


class SubscriptionService:
    """Resolve effective plans and serialize all plan-limit decisions."""

    def __init__(
        self,
        repository: WorkspaceSubscriptionRepository,
        permission_service: PermissionService,
        ai_usage_repository: AIUsageRepository,
        *,
        ai_monthly_request_ceiling: int | None = None,
        clock: Callable[[], datetime] | None = None,
    ) -> None:
        self.repository = repository
        self.permission_service = permission_service
        self.ai_usage_repository = ai_usage_repository
        self.ai_monthly_request_ceiling = ai_monthly_request_ceiling
        self.clock = clock or (lambda: datetime.now(timezone.utc))

    def get_effective_subscription(
        self,
        workspace_id: UUID,
    ) -> tuple[WorkspaceSubscription | None, PlanCode, SubscriptionStatus]:
        subscription = self.repository.get_for_workspace(workspace_id)
        if subscription is None:
            return None, PlanCode.FREE, SubscriptionStatus.ACTIVE
        plan = (
            subscription.plan_code
            if subscription.status in ENTITLEMENT_STATUSES
            else PlanCode.FREE
        )
        return subscription, plan, subscription.status

    def get_plan_limits(self, workspace_id: UUID) -> tuple[PlanCode, PlanLimits]:
        _, plan, _ = self.get_effective_subscription(workspace_id)
        limits = PLAN_LIMITS[plan]
        if self.ai_monthly_request_ceiling is None:
            return plan, limits
        return plan, PlanLimits(
            owned_workspaces=limits.owned_workspaces,
            members_per_workspace=limits.members_per_workspace,
            projects_per_workspace=limits.projects_per_workspace,
            ai_requests_per_month=min(
                limits.ai_requests_per_month,
                self.ai_monthly_request_ceiling,
            ),
        )

    def get_owned_workspace_plan(self, user_id: UUID) -> PlanCode:
        subscriptions = self.repository.subscriptions_for_owned_workspaces(user_id)
        if any(
            subscription.plan_code == PlanCode.PRO
            and subscription.status in ENTITLEMENT_STATUSES
            for subscription in subscriptions
        ):
            return PlanCode.PRO
        return PlanCode.FREE

    def enforce_owned_workspace_limit(self, user_id: UUID) -> None:
        self.repository.lock_user(user_id)
        plan = self.get_owned_workspace_plan(user_id)
        limit = PLAN_LIMITS[plan].owned_workspaces
        if self.repository.count_owned_workspaces(user_id) >= limit:
            raise PlanLimitExceededError(
                "workspace_limit_reached",
                plan,
                limit,
                "Workspace",
            )

    def serialize_owned_workspace_creation(self, user_id: UUID) -> None:
        """Hold the owner row while a caller resolves a default workspace."""

        self.repository.lock_user(user_id)

    def enforce_member_limit(self, workspace_id: UUID) -> None:
        self.repository.lock_workspace(workspace_id)
        plan, limits = self.get_plan_limits(workspace_id)
        if (
            self.repository.count_active_members(workspace_id)
            >= limits.members_per_workspace
        ):
            raise PlanLimitExceededError(
                "member_limit_reached",
                plan,
                limits.members_per_workspace,
                "Member",
            )

    def enforce_project_limit(self, workspace_id: UUID) -> None:
        self.repository.lock_workspace(workspace_id)
        plan, limits = self.get_plan_limits(workspace_id)
        if (
            self.repository.count_active_projects(workspace_id)
            >= limits.projects_per_workspace
        ):
            raise PlanLimitExceededError(
                "project_limit_reached",
                plan,
                limits.projects_per_workspace,
                "Project",
            )

    def get_ai_request_limit(self, workspace_id: UUID) -> tuple[PlanCode, int]:
        plan, limits = self.get_plan_limits(workspace_id)
        return plan, limits.ai_requests_per_month

    def get_summary(
        self,
        user: User,
        workspace_id: UUID,
    ) -> WorkspaceSubscriptionRead:
        self.permission_service.require_workspace_view(user, workspace_id)
        subscription, plan, status = self.get_effective_subscription(workspace_id)
        _, limits = self.get_plan_limits(workspace_id)
        period_start, period_end = utc_month_bounds(
            self.clock().astimezone(timezone.utc)
        )
        ai_usage = self.ai_usage_repository.aggregate(
            workspace_id,
            period_start,
            period_end,
        )
        return WorkspaceSubscriptionRead(
            plan=plan,
            status=status,
            current_period_start=(
                subscription.current_period_start if subscription is not None else None
            ),
            current_period_end=(
                subscription.current_period_end if subscription is not None else None
            ),
            cancel_at_period_end=(
                subscription.cancel_at_period_end if subscription is not None else False
            ),
            limits=WorkspacePlanLimitsRead(
                members=limits.members_per_workspace,
                projects=limits.projects_per_workspace,
                ai_requests_per_month=limits.ai_requests_per_month,
            ),
            usage=WorkspacePlanUsageRead(
                members=self.repository.count_active_members(workspace_id),
                projects=self.repository.count_active_projects(workspace_id),
                ai_requests_this_month=ai_usage.requests_used,
            ),
        )
