from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.subscriptions.plans import PlanCode, SubscriptionStatus


class WorkspacePlanLimitsRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    members: int
    projects: int
    ai_requests_per_month: int


class WorkspacePlanUsageRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    members: int
    projects: int
    ai_requests_this_month: int


class WorkspaceSubscriptionRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    plan: PlanCode
    status: SubscriptionStatus
    current_period_start: datetime | None
    current_period_end: datetime | None
    cancel_at_period_end: bool
    limits: WorkspacePlanLimitsRead
    usage: WorkspacePlanUsageRead
