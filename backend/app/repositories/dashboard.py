from dataclasses import dataclass
from datetime import date, datetime
from uuid import UUID

from sqlalchemy import Date, cast, func, select
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement

from app.core.events import ActivityEventType, ActivityResourceType
from app.models.activity import Activity
from app.models.project import Project
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user import User
from app.models.workspace import Workspace


@dataclass(frozen=True)
class RecentProjectRecord:
    id: UUID
    name: str
    workspace_id: UUID
    workspace_name: str
    task_count: int
    created_at: datetime


@dataclass(frozen=True)
class RecentTaskRecord:
    id: UUID
    title: str
    project_id: UUID
    project_name: str
    status: TaskStatus
    priority: TaskPriority
    assigned_user_id: UUID | None
    assigned_user: str | None
    created_at: datetime


@dataclass(frozen=True)
class ActivityRecord:
    id: UUID
    workspace_id: UUID
    workspace_name: str
    event_type: ActivityEventType
    resource_type: ActivityResourceType
    actor_id: UUID | None
    metadata: dict[str, object]
    created_at: datetime


@dataclass(frozen=True)
class PeriodCountRecord:
    created: int
    completed: int


@dataclass(frozen=True)
class DashboardSnapshot:
    workspace_count: int
    project_count: int
    status_counts: dict[TaskStatus, int]
    priority_counts: dict[TaskPriority, int]
    recent_projects: list[RecentProjectRecord]
    recent_tasks: list[RecentTaskRecord]
    my_tasks: list[RecentTaskRecord]
    activities: list[ActivityRecord]
    period_counts: dict[str, PeriodCountRecord]
    task_creation_trend: dict[date, int]


class DashboardRepository:
    """Read-only aggregate queries for the authenticated owner's dashboard."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def get_snapshot(
        self,
        owner: User,
        period_starts: dict[str, datetime],
        trend_start: datetime,
    ) -> DashboardSnapshot:
        return DashboardSnapshot(
            workspace_count=self._count_workspaces(owner),
            project_count=self._count_projects(owner),
            status_counts=self._count_tasks_by_status(owner),
            priority_counts=self._count_tasks_by_priority(owner),
            recent_projects=self._list_recent_projects(owner),
            recent_tasks=self._list_recent_tasks(owner),
            my_tasks=self._list_recent_tasks(owner, assigned_user_id=owner.id),
            activities=self._list_recent_activities(owner),
            period_counts={
                period: self._count_period_tasks(owner, start)
                for period, start in period_starts.items()
            },
            task_creation_trend=self._get_task_creation_trend(
                owner,
                trend_start,
            ),
        )

    def _count_workspaces(self, owner: User) -> int:
        statement = select(func.count(Workspace.id)).where(
            Workspace.owner_id == owner.id,
            Workspace.deleted_at.is_(None),
        )
        return int(self.session.scalar(statement) or 0)

    def _count_projects(self, owner: User) -> int:
        statement = (
            select(func.count(Project.id))
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(*self._project_filters(owner))
        )
        return int(self.session.scalar(statement) or 0)

    def _count_tasks_by_status(self, owner: User) -> dict[TaskStatus, int]:
        statement = (
            select(Task.status, func.count(Task.id))
            .join(Project, Task.project_id == Project.id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(*self._task_filters(owner))
            .group_by(Task.status)
        )
        return {
            status: int(count)
            for status, count in self.session.execute(statement).all()
        }

    def _count_tasks_by_priority(self, owner: User) -> dict[TaskPriority, int]:
        statement = (
            select(Task.priority, func.count(Task.id))
            .join(Project, Task.project_id == Project.id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(*self._task_filters(owner))
            .group_by(Task.priority)
        )
        return {
            priority: int(count)
            for priority, count in self.session.execute(statement).all()
        }

    def _list_recent_projects(self, owner: User) -> list[RecentProjectRecord]:
        task_count = (
            select(func.count(Task.id))
            .where(
                Task.project_id == Project.id,
                Task.deleted_at.is_(None),
            )
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
                Project.created_at,
            )
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(*self._project_filters(owner))
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
                created_at=row.created_at,
            )
            for row in self.session.execute(statement).all()
        ]

    def _list_recent_tasks(
        self,
        owner: User,
        *,
        assigned_user_id: UUID | None = None,
    ) -> list[RecentTaskRecord]:
        filters = list(self._task_filters(owner))
        if assigned_user_id is not None:
            filters.append(Task.assigned_user_id == assigned_user_id)

        statement = (
            select(
                Task.id,
                Task.title,
                Task.project_id,
                Project.name.label("project_name"),
                Task.status,
                Task.priority,
                Task.assigned_user_id,
                User.full_name.label("assigned_full_name"),
                User.email.label("assigned_email"),
                Task.created_at,
            )
            .join(Project, Task.project_id == Project.id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .outerjoin(User, Task.assigned_user_id == User.id)
            .where(*filters)
            .order_by(Task.created_at.desc(), Task.id.desc())
            .limit(5)
        )
        return [
            RecentTaskRecord(
                id=row.id,
                title=row.title,
                project_id=row.project_id,
                project_name=row.project_name,
                status=row.status,
                priority=row.priority,
                assigned_user_id=row.assigned_user_id,
                assigned_user=row.assigned_full_name or row.assigned_email,
                created_at=row.created_at,
            )
            for row in self.session.execute(statement).all()
        ]

    def _list_recent_activities(self, owner: User) -> list[ActivityRecord]:
        statement = (
            select(
                Activity.id,
                Activity.workspace_id,
                Workspace.name.label("workspace_name"),
                Activity.event_type,
                Activity.resource_type,
                Activity.actor_id,
                Activity.activity_metadata,
                Activity.created_at,
            )
            .join(Workspace, Activity.workspace_id == Workspace.id)
            .where(
                Workspace.owner_id == owner.id,
                Workspace.deleted_at.is_(None),
            )
            .order_by(Activity.created_at.desc(), Activity.id.desc())
            .limit(8)
        )
        return [
            ActivityRecord(
                id=row.id,
                workspace_id=row.workspace_id,
                workspace_name=row.workspace_name,
                event_type=row.event_type,
                resource_type=row.resource_type,
                actor_id=row.actor_id,
                metadata=row.activity_metadata,
                created_at=row.created_at,
            )
            for row in self.session.execute(statement).all()
        ]

    def _count_period_tasks(
        self,
        owner: User,
        start: datetime,
    ) -> PeriodCountRecord:
        statement = (
            select(
                func.count(Task.id).filter(Task.created_at >= start).label("created"),
                func.count(Task.id)
                .filter(
                    Task.status == TaskStatus.DONE,
                    Task.updated_at >= start,
                )
                .label("completed"),
            )
            .join(Project, Task.project_id == Project.id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(*self._task_filters(owner))
        )
        row = self.session.execute(statement).one()
        return PeriodCountRecord(
            created=int(row.created),
            completed=int(row.completed),
        )

    def _get_task_creation_trend(
        self,
        owner: User,
        start: datetime,
    ) -> dict[date, int]:
        creation_date = cast(Task.created_at, Date).label("creation_date")
        statement = (
            select(creation_date, func.count(Task.id))
            .join(Project, Task.project_id == Project.id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(
                *self._task_filters(owner),
                Task.created_at >= start,
            )
            .group_by(creation_date)
            .order_by(creation_date.asc())
        )
        return {
            creation_day: int(count)
            for creation_day, count in self.session.execute(statement).all()
        }

    @staticmethod
    def _project_filters(owner: User) -> tuple[ColumnElement[bool], ...]:
        return (
            Workspace.owner_id == owner.id,
            Workspace.deleted_at.is_(None),
            Project.deleted_at.is_(None),
        )

    @staticmethod
    def _task_filters(owner: User) -> tuple[ColumnElement[bool], ...]:
        return (
            Workspace.owner_id == owner.id,
            Workspace.deleted_at.is_(None),
            Project.deleted_at.is_(None),
            Task.deleted_at.is_(None),
        )
