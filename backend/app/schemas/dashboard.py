from datetime import date, datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.events import ActivityEventType, ActivityResourceType
from app.models.task import TaskPriority, TaskStatus


class DashboardPeriod(str, Enum):
    DAYS_7 = "7d"
    DAYS_30 = "30d"
    DAYS_90 = "90d"

    @property
    def days(self) -> int:
        return {
            self.DAYS_7: 7,
            self.DAYS_30: 30,
            self.DAYS_90: 90,
        }[self]


class DashboardFilters(BaseModel):
    model_config = ConfigDict(extra="forbid")

    workspace_id: UUID | None = None
    project_id: UUID | None = None
    user_id: UUID | None = None
    period: DashboardPeriod = DashboardPeriod.DAYS_30
    activity_limit: int = Field(default=8, ge=1, le=20)


class DashboardProjectSort(str, Enum):
    CREATED_AT_DESC = "-created_at"
    CREATED_AT_ASC = "created_at"
    NAME_ASC = "name"
    NAME_DESC = "-name"
    TASK_COUNT_DESC = "-task_count"
    PROGRESS_DESC = "-progress"


class DashboardProjectListParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    workspace_id: UUID | None = None
    project_id: UUID | None = None
    user_id: UUID | None = None
    period: DashboardPeriod = DashboardPeriod.DAYS_30
    search: str | None = Field(default=None, min_length=1, max_length=255)
    sort: DashboardProjectSort = DashboardProjectSort.CREATED_AT_DESC
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=5, ge=1, le=20)


class DashboardKpiVariations(BaseModel):
    model_config = ConfigDict(extra="forbid")

    workspaces: float | None = None
    projects: float | None = None
    tasks: float | None = None
    completed: float | None = None
    completion_rate: float | None = None
    average_completion_hours: float | None = None
    average_tasks_per_project: float | None = None


class DashboardKpis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    workspaces: int = Field(ge=0)
    projects: int = Field(ge=0)
    tasks: int = Field(ge=0)
    completed: int = Field(ge=0)
    in_progress: int = Field(ge=0)
    pending: int = Field(ge=0)
    urgent: int = Field(ge=0)
    overdue: int = Field(ge=0)
    due_today: int = Field(ge=0)
    due_this_week: int = Field(ge=0)
    completion_rate: float = Field(ge=0, le=100)
    average_completion_hours: float = Field(ge=0)
    average_tasks_per_project: float = Field(ge=0)
    variations: DashboardKpiVariations


class DashboardStatusItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: TaskStatus
    count: int = Field(ge=0)
    percentage: float = Field(ge=0, le=100)


class DashboardPriorityItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    priority: TaskPriority
    count: int = Field(ge=0)


class DashboardProjectDistributionItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project_id: UUID
    project_name: str
    count: int = Field(ge=0)
    percentage: float = Field(ge=0, le=100)


class DashboardAssigneeDistributionItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: UUID | None
    user_name: str
    count: int = Field(ge=0)
    percentage: float = Field(ge=0, le=100)


class DashboardEventDistributionItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event: ActivityEventType
    count: int = Field(ge=0)
    percentage: float = Field(ge=0, le=100)


class DashboardRecentProject(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    name: str
    workspace_id: UUID
    workspace_name: str
    task_count: int = Field(ge=0)
    completed_task_count: int = Field(ge=0)
    progress: float = Field(ge=0, le=100)
    status: str
    created_at: datetime


class DashboardRecentProjectPage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[DashboardRecentProject]
    total: int = Field(ge=0)
    offset: int = Field(ge=0)
    limit: int = Field(ge=1, le=20)


class DashboardRecentTask(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    title: str
    workspace_id: UUID
    workspace_name: str
    project_id: UUID
    project_name: str
    status: TaskStatus
    priority: TaskPriority
    assigned_user_id: UUID | None
    assigned_user: str | None
    due_date: datetime | None
    created_at: datetime


class DashboardActivityActor(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    email: EmailStr
    full_name: str


class DashboardActivity(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    workspace_id: UUID
    workspace_name: str
    event: ActivityEventType
    resource: ActivityResourceType
    resource_id: UUID
    actor_id: UUID | None
    actor: DashboardActivityActor | None
    message: str
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


class DashboardTrends(BaseModel):
    model_config = ConfigDict(extra="forbid")

    task_creations: list[DashboardTrendPoint]
    task_completions: list[DashboardTrendPoint]
    backlog: list[DashboardTrendPoint]
    workspace_creations: list[DashboardTrendPoint]


class DashboardWorkspaceOption(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    name: str


class DashboardProjectOption(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    name: str
    workspace_id: UUID


class DashboardUserOption(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    name: str


class DashboardFilterOptions(BaseModel):
    model_config = ConfigDict(extra="forbid")

    workspaces: list[DashboardWorkspaceOption]
    projects: list[DashboardProjectOption]
    users: list[DashboardUserOption]


class DashboardRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kpis: DashboardKpis
    status_distribution: list[DashboardStatusItem]
    priority_distribution: list[DashboardPriorityItem]
    project_distribution: list[DashboardProjectDistributionItem]
    assignee_distribution: list[DashboardAssigneeDistributionItem]
    event_distribution: list[DashboardEventDistributionItem]
    recent_activities: list[DashboardActivity]
    recent_projects: list[DashboardRecentProject]
    recent_tasks: list[DashboardRecentTask]
    my_tasks: list[DashboardRecentTask]
    quick_stats: DashboardQuickStats
    task_creation_trend: list[DashboardTrendPoint]
    trends: DashboardTrends
    filter_options: DashboardFilterOptions
