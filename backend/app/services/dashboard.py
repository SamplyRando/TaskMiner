from datetime import date, datetime, timedelta, timezone

from app.core.activity_messages import build_activity_message
from app.models.task import TaskPriority, TaskStatus
from app.models.user import User
from app.repositories.dashboard import (
    DashboardRepository,
    PeriodCountRecord,
    RecentProjectRecord,
)
from app.schemas.dashboard import (
    DashboardActivity,
    DashboardActivityActor,
    DashboardAssigneeDistributionItem,
    DashboardEventDistributionItem,
    DashboardFilterOptions,
    DashboardFilters,
    DashboardKpis,
    DashboardKpiVariations,
    DashboardPeriodStats,
    DashboardPriorityItem,
    DashboardProjectDistributionItem,
    DashboardProjectListParams,
    DashboardProjectOption,
    DashboardQuickStats,
    DashboardRead,
    DashboardRecentProject,
    DashboardRecentProjectPage,
    DashboardRecentTask,
    DashboardStatusItem,
    DashboardTrends,
    DashboardTrendPoint,
    DashboardUserOption,
    DashboardWorkspaceOption,
)


class DashboardService:
    """Build the read-only analytics view for an authenticated owner."""

    def __init__(self, repository: DashboardRepository) -> None:
        self.repository = repository

    def get_dashboard(
        self,
        owner: User,
        filters: DashboardFilters,
    ) -> DashboardRead:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        period_starts = {
            "today": today_start,
            "week": today_start - timedelta(days=today_start.weekday()),
            "month": today_start.replace(day=1),
        }
        period_start = today_start - timedelta(days=filters.period.days - 1)
        legacy_trend_start = today_start - timedelta(days=13)
        previous_period_start = period_start - timedelta(days=filters.period.days)
        week_end = period_starts["week"] + timedelta(days=7)
        snapshot = self.repository.get_snapshot(
            owner,
            filters,
            now=now,
            today_start=today_start,
            week_end=week_end,
            period_start=period_start,
            previous_period_start=previous_period_start,
            legacy_trend_start=legacy_trend_start,
            period_starts=period_starts,
        )

        status_counts = {
            status: snapshot.task_metrics.status_counts.get(status, 0)
            for status in TaskStatus
        }
        priority_counts = {
            priority: snapshot.priority_counts.get(priority, 0)
            for priority in TaskPriority
        }
        total_tasks = sum(status_counts.values())
        completed = status_counts[TaskStatus.DONE]
        current_rate = self._percentage(
            snapshot.current_period.completed,
            snapshot.current_period.tasks,
        )
        previous_rate = self._percentage(
            snapshot.previous_period.completed,
            snapshot.previous_period.tasks,
        )
        current_tasks_per_project = self._ratio(
            snapshot.current_period.tasks,
            snapshot.current_period.projects,
        )
        previous_tasks_per_project = self._ratio(
            snapshot.previous_period.tasks,
            snapshot.previous_period.projects,
        )
        average_tasks_per_project = self._ratio(
            total_tasks,
            snapshot.project_count,
        )
        dates = [
            period_start.date() + timedelta(days=index)
            for index in range(filters.period.days)
        ]
        task_creation_trend = self._trend_points(
            dates,
            snapshot.task_creation_trend,
        )
        task_completion_trend = self._trend_points(
            dates,
            snapshot.task_completion_trend,
        )
        backlog = snapshot.opening_backlog
        backlog_trend: list[DashboardTrendPoint] = []
        for index, trend_date in enumerate(dates):
            backlog += (
                task_creation_trend[index].count - task_completion_trend[index].count
            )
            backlog_trend.append(
                DashboardTrendPoint(date=trend_date, count=max(backlog, 0))
            )

        return DashboardRead(
            kpis=DashboardKpis(
                workspaces=snapshot.workspace_count,
                projects=snapshot.project_count,
                tasks=total_tasks,
                completed=completed,
                in_progress=status_counts[TaskStatus.IN_PROGRESS],
                pending=status_counts[TaskStatus.TODO],
                urgent=priority_counts[TaskPriority.URGENT],
                overdue=snapshot.task_metrics.overdue,
                due_today=snapshot.task_metrics.due_today,
                due_this_week=snapshot.task_metrics.due_this_week,
                completion_rate=self._percentage(completed, total_tasks),
                average_completion_hours=(
                    snapshot.task_metrics.average_completion_hours
                ),
                average_tasks_per_project=average_tasks_per_project,
                variations=DashboardKpiVariations(
                    workspaces=self._variation(
                        snapshot.current_period.workspaces,
                        snapshot.previous_period.workspaces,
                    ),
                    projects=self._variation(
                        snapshot.current_period.projects,
                        snapshot.previous_period.projects,
                    ),
                    tasks=self._variation(
                        snapshot.current_period.tasks,
                        snapshot.previous_period.tasks,
                    ),
                    completed=self._variation(
                        snapshot.current_period.completed,
                        snapshot.previous_period.completed,
                    ),
                    completion_rate=self._difference(current_rate, previous_rate),
                    average_completion_hours=self._variation(
                        snapshot.current_period.average_completion_hours,
                        snapshot.previous_period.average_completion_hours,
                    ),
                    average_tasks_per_project=self._variation(
                        current_tasks_per_project,
                        previous_tasks_per_project,
                    ),
                ),
            ),
            status_distribution=[
                DashboardStatusItem(
                    status=status,
                    count=count,
                    percentage=self._percentage(count, total_tasks),
                )
                for status, count in status_counts.items()
            ],
            priority_distribution=[
                DashboardPriorityItem(priority=priority, count=count)
                for priority, count in priority_counts.items()
            ],
            project_distribution=[
                DashboardProjectDistributionItem(
                    project_id=item.project_id,
                    project_name=item.project_name,
                    count=item.count,
                    percentage=self._percentage(item.count, total_tasks),
                )
                for item in snapshot.project_distribution
            ],
            assignee_distribution=[
                DashboardAssigneeDistributionItem(
                    user_id=item.user_id,
                    user_name=item.user_name,
                    count=item.count,
                    percentage=self._percentage(item.count, total_tasks),
                )
                for item in snapshot.assignee_distribution
            ],
            event_distribution=[
                DashboardEventDistributionItem(
                    event=event,
                    count=count,
                    percentage=self._percentage(
                        count,
                        sum(snapshot.event_distribution.values()),
                    ),
                )
                for event, count in snapshot.event_distribution.items()
            ],
            recent_activities=[
                DashboardActivity(
                    id=activity.id,
                    workspace_id=activity.workspace_id,
                    workspace_name=activity.workspace_name,
                    event=activity.event_type,
                    resource=activity.resource_type,
                    resource_id=activity.resource_id,
                    actor_id=activity.actor_id,
                    actor=(
                        DashboardActivityActor(
                            id=activity.actor_id,
                            email=activity.actor_email,
                            full_name=activity.actor_full_name,
                        )
                        if activity.actor_id is not None
                        and activity.actor_email is not None
                        and activity.actor_full_name is not None
                        else None
                    ),
                    message=build_activity_message(
                        activity.event_type,
                        activity.metadata,
                    ),
                    metadata=activity.metadata,
                    created_at=activity.created_at,
                )
                for activity in snapshot.activities
            ],
            recent_projects=[
                self._recent_project(project) for project in snapshot.recent_projects
            ],
            recent_tasks=[
                DashboardRecentTask.model_validate(task, from_attributes=True)
                for task in snapshot.recent_tasks
            ],
            my_tasks=[
                DashboardRecentTask.model_validate(task, from_attributes=True)
                for task in snapshot.my_tasks
            ],
            quick_stats=DashboardQuickStats(
                today=self._period_stats(snapshot.period_counts["today"]),
                week=self._period_stats(snapshot.period_counts["week"]),
                month=self._period_stats(snapshot.period_counts["month"]),
            ),
            task_creation_trend=self._trend_points(
                [
                    legacy_trend_start.date() + timedelta(days=index)
                    for index in range(14)
                ],
                snapshot.legacy_task_creation_trend,
            ),
            trends=DashboardTrends(
                task_creations=task_creation_trend,
                task_completions=task_completion_trend,
                backlog=backlog_trend,
                workspace_creations=self._trend_points(
                    dates,
                    snapshot.workspace_creation_trend,
                ),
            ),
            filter_options=DashboardFilterOptions(
                workspaces=[
                    DashboardWorkspaceOption.model_validate(item, from_attributes=True)
                    for item in snapshot.workspace_options
                ],
                projects=[
                    DashboardProjectOption.model_validate(item, from_attributes=True)
                    for item in snapshot.project_options
                ],
                users=[
                    DashboardUserOption.model_validate(item, from_attributes=True)
                    for item in snapshot.user_options
                ],
            ),
        )

    def list_projects(
        self,
        owner: User,
        params: DashboardProjectListParams,
    ) -> DashboardRecentProjectPage:
        today_start = datetime.now(timezone.utc).replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )
        period_start = today_start - timedelta(days=params.period.days - 1)
        projects, total = self.repository.list_projects(
            owner,
            params,
            period_start=period_start,
        )
        return DashboardRecentProjectPage(
            items=[self._recent_project(project) for project in projects],
            total=total,
            offset=params.offset,
            limit=params.limit,
        )

    @classmethod
    def _recent_project(
        cls,
        project: RecentProjectRecord,
    ) -> DashboardRecentProject:
        progress = cls._percentage(
            project.completed_task_count,
            project.task_count,
        )
        if project.task_count == 0:
            status = "empty"
        elif project.completed_task_count == project.task_count:
            status = "completed"
        else:
            status = "active"
        return DashboardRecentProject(
            id=project.id,
            name=project.name,
            workspace_id=project.workspace_id,
            workspace_name=project.workspace_name,
            task_count=project.task_count,
            completed_task_count=project.completed_task_count,
            progress=progress,
            status=status,
            created_at=project.created_at,
        )

    @classmethod
    def _period_stats(cls, counts: PeriodCountRecord) -> DashboardPeriodStats:
        return DashboardPeriodStats(
            created=counts.created,
            completed=counts.completed,
            completion_rate=min(
                cls._percentage(counts.completed, counts.created),
                100.0,
            ),
        )

    @staticmethod
    def _trend_points(
        dates: list[date],
        values: dict[date, int],
    ) -> list[DashboardTrendPoint]:
        return [
            DashboardTrendPoint(date=trend_date, count=values.get(trend_date, 0))
            for trend_date in dates
        ]

    @staticmethod
    def _percentage(value: int, total: int) -> float:
        if total == 0:
            return 0.0
        return round(value / total * 100, 1)

    @staticmethod
    def _ratio(value: int, total: int) -> float:
        if total == 0:
            return 0.0
        return round(value / total, 1)

    @staticmethod
    def _variation(current: int | float, previous: int | float) -> float | None:
        if previous == 0:
            return None
        return round((current - previous) / previous * 100, 1)

    @staticmethod
    def _difference(current: float, previous: float) -> float | None:
        if current == 0 and previous == 0:
            return None
        return round(current - previous, 1)
