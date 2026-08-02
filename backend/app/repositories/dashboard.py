from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import Date, String, and_, case, cast, func, or_, select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import InstrumentedAttribute
from sqlalchemy.sql.elements import ColumnElement

from app.core.events import ActivityEventType, ActivityResourceType
from app.models.activity import Activity
from app.models.project import Project
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.schemas.dashboard import DashboardFilters, DashboardProjectListParams


@dataclass(frozen=True)
class TaskMetricsRecord:
    status_counts: dict[TaskStatus, int]
    overdue: int
    due_today: int
    due_this_week: int
    average_completion_hours: float


@dataclass(frozen=True)
class PeriodMetricsRecord:
    workspaces: int
    projects: int
    tasks: int
    completed: int
    average_completion_hours: float


@dataclass(frozen=True)
class RecentProjectRecord:
    id: UUID
    name: str
    workspace_id: UUID
    workspace_name: str
    task_count: int
    completed_task_count: int
    created_at: datetime


@dataclass(frozen=True)
class RecentTaskRecord:
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


@dataclass(frozen=True)
class ActivityRecord:
    id: UUID
    workspace_id: UUID
    workspace_name: str
    event_type: ActivityEventType
    resource_type: ActivityResourceType
    resource_id: UUID
    actor_id: UUID | None
    actor_email: str | None
    actor_full_name: str | None
    metadata: dict[str, object]
    created_at: datetime


@dataclass(frozen=True)
class PeriodCountRecord:
    created: int
    completed: int


@dataclass(frozen=True)
class ProjectDistributionRecord:
    project_id: UUID
    project_name: str
    count: int


@dataclass(frozen=True)
class AssigneeDistributionRecord:
    user_id: UUID | None
    user_name: str
    count: int


@dataclass(frozen=True)
class WorkspaceOptionRecord:
    id: UUID
    name: str


@dataclass(frozen=True)
class ProjectOptionRecord:
    id: UUID
    name: str
    workspace_id: UUID


@dataclass(frozen=True)
class UserOptionRecord:
    id: UUID
    name: str


@dataclass(frozen=True)
class DashboardSnapshot:
    workspace_count: int
    project_count: int
    task_metrics: TaskMetricsRecord
    priority_counts: dict[TaskPriority, int]
    current_period: PeriodMetricsRecord
    previous_period: PeriodMetricsRecord
    recent_projects: list[RecentProjectRecord]
    recent_tasks: list[RecentTaskRecord]
    my_tasks: list[RecentTaskRecord]
    activities: list[ActivityRecord]
    period_counts: dict[str, PeriodCountRecord]
    task_creation_trend: dict[date, int]
    legacy_task_creation_trend: dict[date, int]
    task_completion_trend: dict[date, int]
    workspace_creation_trend: dict[date, int]
    opening_backlog: int
    project_distribution: list[ProjectDistributionRecord]
    assignee_distribution: list[AssigneeDistributionRecord]
    event_distribution: dict[ActivityEventType, int]
    workspace_options: list[WorkspaceOptionRecord]
    project_options: list[ProjectOptionRecord]
    user_options: list[UserOptionRecord]


class DashboardRepository:
    """Read-only aggregate queries for the authenticated owner's dashboard."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def get_snapshot(
        self,
        owner: User,
        filters: DashboardFilters,
        *,
        now: datetime,
        today_start: datetime,
        week_end: datetime,
        period_start: datetime,
        previous_period_start: datetime,
        legacy_trend_start: datetime,
        period_starts: dict[str, datetime],
    ) -> DashboardSnapshot:
        task_creations = self._get_task_trend(
            owner,
            filters,
            period_start,
            timestamp=Task.created_at,
        )
        task_completions = self._get_task_trend(
            owner,
            filters,
            period_start,
            timestamp=Task.updated_at,
            completed_only=True,
        )
        legacy_task_creations = (
            task_creations
            if period_start <= legacy_trend_start
            else self._get_task_trend(
                owner,
                filters,
                legacy_trend_start,
                timestamp=Task.created_at,
            )
        )
        return DashboardSnapshot(
            workspace_count=self._count_workspaces(owner, filters),
            project_count=self._count_projects(owner, filters),
            task_metrics=self._get_task_metrics(
                owner,
                filters,
                now=now,
                today_start=today_start,
                week_end=week_end,
            ),
            priority_counts=self._count_tasks_by_priority(owner, filters),
            current_period=self._get_period_metrics(
                owner,
                filters,
                period_start,
                now,
            ),
            previous_period=self._get_period_metrics(
                owner,
                filters,
                previous_period_start,
                period_start,
            ),
            recent_projects=self._list_recent_projects(owner, filters),
            recent_tasks=self._list_recent_tasks(owner, filters),
            my_tasks=self._list_recent_tasks(
                owner,
                filters,
                assigned_user_id=owner.id,
                apply_user_filter=False,
            ),
            activities=self._list_recent_activities(owner, filters),
            period_counts={
                period: self._count_period_tasks(owner, filters, start)
                for period, start in period_starts.items()
            },
            task_creation_trend=task_creations,
            legacy_task_creation_trend=legacy_task_creations,
            task_completion_trend=task_completions,
            workspace_creation_trend=self._get_workspace_creation_trend(
                owner,
                filters,
                period_start,
            ),
            opening_backlog=self._get_opening_backlog(
                owner,
                filters,
                period_start,
            ),
            project_distribution=self._get_project_distribution(owner, filters),
            assignee_distribution=self._get_assignee_distribution(owner, filters),
            event_distribution=self._get_event_distribution(
                owner,
                filters,
                period_start,
            ),
            workspace_options=self._list_workspace_options(owner),
            project_options=self._list_project_options(owner, filters.workspace_id),
            user_options=self._list_user_options(owner, filters.workspace_id),
        )

    def list_projects(
        self,
        owner: User,
        params: DashboardProjectListParams,
        *,
        period_start: datetime,
    ) -> tuple[list[RecentProjectRecord], int]:
        filters = DashboardFilters(
            workspace_id=params.workspace_id,
            project_id=params.project_id,
            user_id=params.user_id,
            period=params.period,
        )
        conditions = [
            *self._project_filters(owner, filters),
            Project.created_at >= period_start,
        ]
        if params.search is not None:
            pattern = f"%{params.search}%"
            conditions.append(
                or_(
                    Project.name.ilike(pattern),
                    Project.description.ilike(pattern),
                    Workspace.name.ilike(pattern),
                )
            )

        task_filters: list[ColumnElement[bool]] = [
            Task.project_id == Project.id,
            Task.deleted_at.is_(None),
        ]
        if params.user_id is not None:
            task_filters.append(Task.assigned_user_id == params.user_id)
        task_count = (
            select(func.count(Task.id))
            .where(*task_filters)
            .correlate(Project)
            .scalar_subquery()
        )
        completed_count = (
            select(func.count(Task.id))
            .where(*task_filters, Task.status == TaskStatus.DONE)
            .correlate(Project)
            .scalar_subquery()
        )
        progress = case(
            (task_count == 0, 0.0),
            else_=completed_count * 100.0 / task_count,
        )
        total = int(
            self.session.scalar(
                select(func.count(Project.id))
                .join(Workspace, Project.workspace_id == Workspace.id)
                .where(*conditions)
            )
            or 0
        )
        sort_columns: dict[str, Any] = {
            "created_at": Project.created_at,
            "name": Project.name,
            "task_count": task_count,
            "progress": progress,
        }
        sort_value = params.sort.value
        sort_column = sort_columns[sort_value.removeprefix("-")]
        sort_expression = (
            sort_column.desc() if sort_value.startswith("-") else sort_column.asc()
        )
        statement = (
            select(
                Project.id,
                Project.name,
                Workspace.id.label("workspace_id"),
                Workspace.name.label("workspace_name"),
                task_count.label("task_count"),
                completed_count.label("completed_task_count"),
                Project.created_at,
            )
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(*conditions)
            .order_by(sort_expression, Project.id.asc())
            .offset(params.offset)
            .limit(params.limit)
        )
        return (
            [
                RecentProjectRecord(
                    id=row.id,
                    name=row.name,
                    workspace_id=row.workspace_id,
                    workspace_name=row.workspace_name,
                    task_count=int(row.task_count),
                    completed_task_count=int(row.completed_task_count),
                    created_at=row.created_at,
                )
                for row in self.session.execute(statement).all()
            ],
            total,
        )

    def _count_workspaces(self, owner: User, filters: DashboardFilters) -> int:
        statement = select(func.count(Workspace.id)).where(
            *self._workspace_filters(owner, filters),
        )
        return int(self.session.scalar(statement) or 0)

    def _count_projects(self, owner: User, filters: DashboardFilters) -> int:
        statement = (
            select(func.count(Project.id))
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(*self._project_filters(owner, filters))
        )
        return int(self.session.scalar(statement) or 0)

    def _get_task_metrics(
        self,
        owner: User,
        filters: DashboardFilters,
        *,
        now: datetime,
        today_start: datetime,
        week_end: datetime,
    ) -> TaskMetricsRecord:
        statement = (
            select(
                Task.status,
                func.count(Task.id).label("task_count"),
                func.count(Task.id)
                .filter(
                    Task.status != TaskStatus.DONE,
                    Task.due_date < now,
                )
                .label("overdue"),
                func.count(Task.id)
                .filter(
                    Task.status != TaskStatus.DONE,
                    Task.due_date >= today_start,
                    Task.due_date < today_start + timedelta(days=1),
                )
                .label("due_today"),
                func.count(Task.id)
                .filter(
                    Task.status != TaskStatus.DONE,
                    Task.due_date >= today_start,
                    Task.due_date < week_end,
                )
                .label("due_this_week"),
                func.avg(
                    func.extract("epoch", Task.updated_at - Task.created_at) / 3600
                )
                .filter(Task.status == TaskStatus.DONE)
                .label("average_completion_hours"),
            )
            .join(Project, Task.project_id == Project.id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(*self._task_filters(owner, filters))
            .group_by(Task.status)
        )
        rows = self.session.execute(statement).all()
        return TaskMetricsRecord(
            status_counts={row.status: int(row.task_count) for row in rows},
            overdue=sum(int(row.overdue) for row in rows),
            due_today=sum(int(row.due_today) for row in rows),
            due_this_week=sum(int(row.due_this_week) for row in rows),
            average_completion_hours=self._weighted_average(
                [
                    (
                        float(row.average_completion_hours or 0),
                        int(row.task_count),
                    )
                    for row in rows
                    if row.status == TaskStatus.DONE
                ]
            ),
        )

    def _count_tasks_by_priority(
        self,
        owner: User,
        filters: DashboardFilters,
    ) -> dict[TaskPriority, int]:
        statement = (
            select(Task.priority, func.count(Task.id))
            .join(Project, Task.project_id == Project.id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(*self._task_filters(owner, filters))
            .group_by(Task.priority)
        )
        return {
            priority: int(count)
            for priority, count in self.session.execute(statement).all()
        }

    def _get_period_metrics(
        self,
        owner: User,
        filters: DashboardFilters,
        start: datetime,
        end: datetime,
    ) -> PeriodMetricsRecord:
        workspace_count = self.session.scalar(
            select(func.count(Workspace.id)).where(
                *self._workspace_filters(owner, filters),
                Workspace.created_at >= start,
                Workspace.created_at < end,
            )
        )
        project_count = self.session.scalar(
            select(func.count(Project.id))
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(
                *self._project_filters(owner, filters),
                Project.created_at >= start,
                Project.created_at < end,
            )
        )
        row = self.session.execute(
            select(
                func.count(Task.id)
                .filter(Task.created_at >= start, Task.created_at < end)
                .label("tasks"),
                func.count(Task.id)
                .filter(
                    Task.status == TaskStatus.DONE,
                    Task.updated_at >= start,
                    Task.updated_at < end,
                )
                .label("completed"),
                func.avg(
                    func.extract("epoch", Task.updated_at - Task.created_at) / 3600
                )
                .filter(
                    Task.status == TaskStatus.DONE,
                    Task.updated_at >= start,
                    Task.updated_at < end,
                )
                .label("average_completion_hours"),
            )
            .join(Project, Task.project_id == Project.id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(*self._task_filters(owner, filters))
        ).one()
        return PeriodMetricsRecord(
            workspaces=int(workspace_count or 0),
            projects=int(project_count or 0),
            tasks=int(row.tasks),
            completed=int(row.completed),
            average_completion_hours=round(
                float(row.average_completion_hours or 0),
                1,
            ),
        )

    def _list_recent_projects(
        self,
        owner: User,
        filters: DashboardFilters,
    ) -> list[RecentProjectRecord]:
        task_filters: list[ColumnElement[bool]] = [
            Task.project_id == Project.id,
            Task.deleted_at.is_(None),
        ]
        if filters.user_id is not None:
            task_filters.append(Task.assigned_user_id == filters.user_id)
        task_count = (
            select(func.count(Task.id))
            .where(*task_filters)
            .correlate(Project)
            .scalar_subquery()
        )
        completed_count = (
            select(func.count(Task.id))
            .where(*task_filters, Task.status == TaskStatus.DONE)
            .correlate(Project)
            .scalar_subquery()
        )
        statement = (
            select(
                Project.id,
                Project.name,
                Workspace.id.label("workspace_id"),
                Workspace.name.label("workspace_name"),
                task_count.label("task_count"),
                completed_count.label("completed_task_count"),
                Project.created_at,
            )
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(*self._project_filters(owner, filters))
            .order_by(Project.created_at.desc(), Project.id.desc())
            .limit(5)
        )
        return [
            RecentProjectRecord(
                id=row.id,
                name=row.name,
                workspace_id=row.workspace_id,
                workspace_name=row.workspace_name,
                task_count=int(row.task_count),
                completed_task_count=int(row.completed_task_count),
                created_at=row.created_at,
            )
            for row in self.session.execute(statement).all()
        ]

    def _list_recent_tasks(
        self,
        owner: User,
        filters: DashboardFilters,
        *,
        assigned_user_id: UUID | None = None,
        apply_user_filter: bool = True,
    ) -> list[RecentTaskRecord]:
        task_filters = list(
            self._task_filters(owner, filters, apply_user_filter=apply_user_filter)
        )
        if assigned_user_id is not None:
            task_filters.append(Task.assigned_user_id == assigned_user_id)

        urgency = case(
            (Task.priority == TaskPriority.URGENT, 0),
            (Task.priority == TaskPriority.HIGH, 1),
            (Task.priority == TaskPriority.MEDIUM, 2),
            else_=3,
        )
        ordering = (
            (urgency.asc(), Task.due_date.asc().nullslast(), Task.created_at.desc())
            if assigned_user_id is not None
            else (Task.created_at.desc(), Task.id.desc())
        )
        statement = (
            select(
                Task.id,
                Task.title,
                Workspace.id.label("workspace_id"),
                Workspace.name.label("workspace_name"),
                Task.project_id,
                Project.name.label("project_name"),
                Task.status,
                Task.priority,
                Task.assigned_user_id,
                User.full_name.label("assigned_full_name"),
                User.email.label("assigned_email"),
                Task.due_date,
                Task.created_at,
            )
            .join(Project, Task.project_id == Project.id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .outerjoin(User, Task.assigned_user_id == User.id)
            .where(*task_filters)
            .order_by(*ordering)
            .limit(10)
        )
        return [
            RecentTaskRecord(
                id=row.id,
                title=row.title,
                workspace_id=row.workspace_id,
                workspace_name=row.workspace_name,
                project_id=row.project_id,
                project_name=row.project_name,
                status=row.status,
                priority=row.priority,
                assigned_user_id=row.assigned_user_id,
                assigned_user=row.assigned_full_name or row.assigned_email,
                due_date=row.due_date,
                created_at=row.created_at,
            )
            for row in self.session.execute(statement).all()
        ]

    def _list_recent_activities(
        self,
        owner: User,
        filters: DashboardFilters,
    ) -> list[ActivityRecord]:
        statement = (
            select(
                Activity.id,
                Activity.workspace_id,
                Workspace.name.label("workspace_name"),
                Activity.event_type,
                Activity.resource_type,
                Activity.resource_id,
                Activity.actor_id,
                User.email.label("actor_email"),
                User.full_name.label("actor_full_name"),
                Activity.activity_metadata,
                Activity.created_at,
            )
            .join(Workspace, Activity.workspace_id == Workspace.id)
            .outerjoin(User, Activity.actor_id == User.id)
            .where(*self._activity_filters(owner, filters))
            .order_by(Activity.created_at.desc(), Activity.id.desc())
            .limit(filters.activity_limit)
        )
        return [
            ActivityRecord(
                id=row.id,
                workspace_id=row.workspace_id,
                workspace_name=row.workspace_name,
                event_type=row.event_type,
                resource_type=row.resource_type,
                resource_id=row.resource_id,
                actor_id=row.actor_id,
                actor_email=row.actor_email,
                actor_full_name=row.actor_full_name,
                metadata=row.activity_metadata,
                created_at=row.created_at,
            )
            for row in self.session.execute(statement).all()
        ]

    def _count_period_tasks(
        self,
        owner: User,
        filters: DashboardFilters,
        start: datetime,
    ) -> PeriodCountRecord:
        statement = (
            select(
                func.count(Task.id).filter(Task.created_at >= start).label("created"),
                func.count(Task.id)
                .filter(Task.status == TaskStatus.DONE, Task.updated_at >= start)
                .label("completed"),
            )
            .join(Project, Task.project_id == Project.id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(*self._task_filters(owner, filters))
        )
        row = self.session.execute(statement).one()
        return PeriodCountRecord(created=int(row.created), completed=int(row.completed))

    def _get_task_trend(
        self,
        owner: User,
        filters: DashboardFilters,
        start: datetime,
        *,
        timestamp: InstrumentedAttribute[datetime] | ColumnElement[datetime],
        completed_only: bool = False,
    ) -> dict[date, int]:
        trend_date = cast(timestamp, Date).label("trend_date")
        conditions = [*self._task_filters(owner, filters), timestamp >= start]
        if completed_only:
            conditions.append(Task.status == TaskStatus.DONE)
        statement = (
            select(trend_date, func.count(Task.id))
            .join(Project, Task.project_id == Project.id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(*conditions)
            .group_by(trend_date)
            .order_by(trend_date.asc())
        )
        return {
            trend_day: int(count)
            for trend_day, count in self.session.execute(statement).all()
        }

    def _get_workspace_creation_trend(
        self,
        owner: User,
        filters: DashboardFilters,
        start: datetime,
    ) -> dict[date, int]:
        creation_date = cast(Workspace.created_at, Date).label("creation_date")
        statement = (
            select(creation_date, func.count(Workspace.id))
            .where(
                *self._workspace_filters(owner, filters),
                Workspace.created_at >= start,
            )
            .group_by(creation_date)
            .order_by(creation_date.asc())
        )
        return {
            creation_day: int(count)
            for creation_day, count in self.session.execute(statement).all()
        }

    def _get_opening_backlog(
        self,
        owner: User,
        filters: DashboardFilters,
        start: datetime,
    ) -> int:
        statement = (
            select(func.count(Task.id))
            .join(Project, Task.project_id == Project.id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(
                *self._task_filters(owner, filters),
                Task.created_at < start,
                or_(Task.status != TaskStatus.DONE, Task.updated_at >= start),
            )
        )
        return int(self.session.scalar(statement) or 0)

    def _get_project_distribution(
        self,
        owner: User,
        filters: DashboardFilters,
    ) -> list[ProjectDistributionRecord]:
        statement = (
            select(
                Project.id,
                Project.name,
                func.count(Task.id).label("task_count"),
            )
            .join(Task, Task.project_id == Project.id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(*self._task_filters(owner, filters))
            .group_by(Project.id, Project.name)
            .order_by(func.count(Task.id).desc(), Project.name.asc())
            .limit(10)
        )
        return [
            ProjectDistributionRecord(
                project_id=row.id,
                project_name=row.name,
                count=int(row.task_count),
            )
            for row in self.session.execute(statement).all()
        ]

    def _get_assignee_distribution(
        self,
        owner: User,
        filters: DashboardFilters,
    ) -> list[AssigneeDistributionRecord]:
        user_name = func.coalesce(User.full_name, User.email, "Non assignée")
        statement = (
            select(
                Task.assigned_user_id, user_name.label("user_name"), func.count(Task.id)
            )
            .join(Project, Task.project_id == Project.id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .outerjoin(User, Task.assigned_user_id == User.id)
            .where(*self._task_filters(owner, filters))
            .group_by(Task.assigned_user_id, User.full_name, User.email)
            .order_by(func.count(Task.id).desc(), user_name.asc())
            .limit(10)
        )
        return [
            AssigneeDistributionRecord(
                user_id=row.assigned_user_id,
                user_name=row.user_name,
                count=int(row[2]),
            )
            for row in self.session.execute(statement).all()
        ]

    def _get_event_distribution(
        self,
        owner: User,
        filters: DashboardFilters,
        start: datetime,
    ) -> dict[ActivityEventType, int]:
        statement = (
            select(Activity.event_type, func.count(Activity.id))
            .join(Workspace, Activity.workspace_id == Workspace.id)
            .where(
                *self._activity_filters(owner, filters),
                Activity.created_at >= start,
            )
            .group_by(Activity.event_type)
            .order_by(func.count(Activity.id).desc())
        )
        return {
            event_type: int(count)
            for event_type, count in self.session.execute(statement).all()
        }

    def _list_workspace_options(self, owner: User) -> list[WorkspaceOptionRecord]:
        statement = (
            select(Workspace.id, Workspace.name)
            .where(Workspace.owner_id == owner.id, Workspace.deleted_at.is_(None))
            .order_by(Workspace.name.asc())
        )
        return [
            WorkspaceOptionRecord(id=row.id, name=row.name)
            for row in self.session.execute(statement).all()
        ]

    def _list_project_options(
        self,
        owner: User,
        workspace_id: UUID | None,
    ) -> list[ProjectOptionRecord]:
        filters: list[ColumnElement[bool]] = [
            Workspace.owner_id == owner.id,
            Workspace.deleted_at.is_(None),
            Project.deleted_at.is_(None),
        ]
        if workspace_id is not None:
            filters.append(Workspace.id == workspace_id)
        statement = (
            select(Project.id, Project.name, Project.workspace_id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(*filters)
            .order_by(Project.name.asc())
        )
        return [
            ProjectOptionRecord(
                id=row.id,
                name=row.name,
                workspace_id=row.workspace_id,
            )
            for row in self.session.execute(statement).all()
        ]

    def _list_user_options(
        self,
        owner: User,
        workspace_id: UUID | None,
    ) -> list[UserOptionRecord]:
        filters: list[ColumnElement[bool]] = [
            Workspace.owner_id == owner.id,
            Workspace.deleted_at.is_(None),
            User.is_active.is_(True),
        ]
        if workspace_id is not None:
            filters.append(Workspace.id == workspace_id)
        user_name = func.coalesce(User.full_name, User.email)
        statement = (
            select(User.id, user_name.label("name"))
            .join(WorkspaceMember, WorkspaceMember.user_id == User.id)
            .join(Workspace, WorkspaceMember.workspace_id == Workspace.id)
            .where(*filters)
            .distinct()
            .order_by(user_name.asc())
        )
        return [
            UserOptionRecord(id=row.id, name=row.name)
            for row in self.session.execute(statement).all()
        ]

    @staticmethod
    def _workspace_filters(
        owner: User,
        filters: DashboardFilters,
    ) -> tuple[ColumnElement[bool], ...]:
        conditions: list[ColumnElement[bool]] = [
            Workspace.owner_id == owner.id,
            Workspace.deleted_at.is_(None),
        ]
        if filters.workspace_id is not None:
            conditions.append(Workspace.id == filters.workspace_id)
        return tuple(conditions)

    @classmethod
    def _project_filters(
        cls,
        owner: User,
        filters: DashboardFilters,
    ) -> tuple[ColumnElement[bool], ...]:
        conditions = [
            *cls._workspace_filters(owner, filters),
            Project.deleted_at.is_(None),
        ]
        if filters.project_id is not None:
            conditions.append(Project.id == filters.project_id)
        return tuple(conditions)

    @classmethod
    def _task_filters(
        cls,
        owner: User,
        filters: DashboardFilters,
        *,
        apply_user_filter: bool = True,
    ) -> tuple[ColumnElement[bool], ...]:
        conditions = [
            *cls._project_filters(owner, filters),
            Task.deleted_at.is_(None),
        ]
        if apply_user_filter and filters.user_id is not None:
            conditions.append(Task.assigned_user_id == filters.user_id)
        return tuple(conditions)

    @staticmethod
    def _activity_filters(
        owner: User,
        filters: DashboardFilters,
    ) -> tuple[ColumnElement[bool], ...]:
        conditions: list[ColumnElement[bool]] = [
            Workspace.owner_id == owner.id,
            Workspace.deleted_at.is_(None),
        ]
        if filters.workspace_id is not None:
            conditions.append(Workspace.id == filters.workspace_id)
        if filters.user_id is not None:
            conditions.append(Activity.actor_id == filters.user_id)
        if filters.project_id is not None:
            project_task_ids = select(Task.id).where(
                Task.project_id == filters.project_id
            )
            project_task_id_strings = select(cast(Task.id, String)).where(
                Task.project_id == filters.project_id
            )
            conditions.append(
                or_(
                    and_(
                        Activity.resource_type == ActivityResourceType.PROJECT,
                        Activity.resource_id == filters.project_id,
                    ),
                    and_(
                        Activity.resource_type == ActivityResourceType.TASK,
                        Activity.resource_id.in_(project_task_ids),
                    ),
                    Activity.activity_metadata["project_id"].astext
                    == str(filters.project_id),
                    Activity.activity_metadata["task_id"].astext.in_(
                        project_task_id_strings
                    ),
                )
            )
        return tuple(conditions)

    @staticmethod
    def _weighted_average(values: list[tuple[float, int]]) -> float:
        total_weight = sum(weight for _, weight in values)
        if total_weight == 0:
            return 0.0
        return round(
            sum(value * weight for value, weight in values) / total_weight,
            1,
        )
