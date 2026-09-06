from dataclasses import dataclass
from enum import Enum


class PlanCode(str, Enum):
    FREE = "free"
    PRO = "pro"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    TRIALING = "trialing"
    INCOMPLETE = "incomplete"


class SubscriptionSource(str, Enum):
    INTERNAL = "internal"
    STRIPE = "stripe"


@dataclass(frozen=True)
class PlanLimits:
    owned_workspaces: int
    members_per_workspace: int
    projects_per_workspace: int
    ai_requests_per_month: int


PLAN_LIMITS: dict[PlanCode, PlanLimits] = {
    PlanCode.FREE: PlanLimits(
        owned_workspaces=1,
        members_per_workspace=3,
        projects_per_workspace=5,
        ai_requests_per_month=25,
    ),
    PlanCode.PRO: PlanLimits(
        owned_workspaces=5,
        members_per_workspace=15,
        projects_per_workspace=50,
        ai_requests_per_month=500,
    ),
}

ENTITLEMENT_STATUSES = {
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.TRIALING,
}
