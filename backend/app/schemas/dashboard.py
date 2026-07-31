from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.core.events import ActivityEventType, ActivityResourceType
from app.models.task import TaskPriority, TaskStatus


class DashboardKpis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    workspaces: int = Field(ge=0)
    projects: int = Field(ge=0)
    tasks: int = Field(ge=0)
    completed: int = Field(ge=0)
    in_progress: int = Field(ge=0)
    pending: int = Field(ge=0)
    urgent: int = Field(ge=0)
    completion_rate: float = Field(ge=0, le=100)


class DashboardStatusItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: TaskStatus
    count: int = Field(ge=0)
    percentage: float = Field(ge=0, le=100)


class DashboardPriorityItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    priority: TaskPriority
    count: int = Field(ge=0)


class DashboardRecentProject(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    name: str
    workspace_id: UUID
    workspace_name: str
    task_count: int = Field(ge=0)
    created_at: datetime


class DashboardRecentTask(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    title: str
    project_id: UUID
    project_name: str
    status: TaskStatus
    priority: TaskPriority
    assigned_user_id: UUID | None
    assigned_user: str | None
    created_at: datetime


class DashboardActivity(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    workspace_id: UUID
    workspace_name: str
    event: ActivityEventType
    resource: ActivityResourceType
    actor_id: UUID | None
    metadata: dict[str, Any]
    created_at: datetime


class DashboardPeriodStats(BaseModel):
    model_config = ConfigDict(extra="forbid")

    created: int = Field(ge=0)
    completed: int = Field(ge=0)
    completion_rate: float = Field(ge=0, le=100)


class DashboardQuickStats(BaseModel):
    model_config = ConfigDict(extra="forbid")

    today: DashboardPeriodStats
    week: DashboardPeriodStats
    month: DashboardPeriodStats


class DashboardTrendPoint(BaseModel):
    model_config = ConfigDict(extra="forbid")

    date: date
    count: int = Field(ge=0)


class DashboardRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kpis: DashboardKpis
    status_distribution: list[DashboardStatusItem]
    priority_distribution: list[DashboardPriorityItem]
    recent_activities: list[DashboardActivity]
    recent_projects: list[DashboardRecentProject]
    recent_tasks: list[DashboardRecentTask]
    my_tasks: list[DashboardRecentTask]
    quick_stats: DashboardQuickStats
    task_creation_trend: list[DashboardTrendPoint]
