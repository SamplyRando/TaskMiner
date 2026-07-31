from datetime import datetime, timedelta, timezone

from app.models.task import TaskPriority, TaskStatus
from app.models.user import User
from app.repositories.dashboard import DashboardRepository, PeriodCountRecord
from app.schemas.dashboard import (
    DashboardActivity,
    DashboardKpis,
    DashboardPeriodStats,
    DashboardPriorityItem,
    DashboardQuickStats,
    DashboardRead,
    DashboardRecentProject,
    DashboardRecentTask,
    DashboardStatusItem,
    DashboardTrendPoint,
)


class DashboardService:
    """Build the read-only analytics view for an authenticated owner."""

    def __init__(self, repository: DashboardRepository) -> None:
        self.repository = repository

    def get_dashboard(self, owner: User) -> DashboardRead:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        period_starts = {
            "today": today_start,
            "week": today_start - timedelta(days=today_start.weekday()),
            "month": today_start.replace(day=1),
        }
        trend_start = today_start - timedelta(days=13)
        snapshot = self.repository.get_snapshot(
            owner,
            period_starts,
            trend_start,
        )

        status_counts = {
            status: snapshot.status_counts.get(status, 0) for status in TaskStatus
        }
        priority_counts = {
            priority: snapshot.priority_counts.get(priority, 0)
            for priority in TaskPriority
        }
        total_tasks = sum(status_counts.values())
        completed = status_counts[TaskStatus.DONE]

        return DashboardRead(
            kpis=DashboardKpis(
                workspaces=snapshot.workspace_count,
                projects=snapshot.project_count,
                tasks=total_tasks,
                completed=completed,
                in_progress=status_counts[TaskStatus.IN_PROGRESS],
                pending=status_counts[TaskStatus.TODO],
                urgent=priority_counts[TaskPriority.URGENT],
                completion_rate=self._percentage(completed, total_tasks),
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
            recent_activities=[
                DashboardActivity(
                    id=activity.id,
                    workspace_id=activity.workspace_id,
                    workspace_name=activity.workspace_name,
                    event=activity.event_type,
                    resource=activity.resource_type,
                    actor_id=activity.actor_id,
                    metadata=activity.metadata,
                    created_at=activity.created_at,
                )
                for activity in snapshot.activities
            ],
            recent_projects=[
                DashboardRecentProject.model_validate(project, from_attributes=True)
                for project in snapshot.recent_projects
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
            task_creation_trend=[
                DashboardTrendPoint(
                    date=trend_start.date() + timedelta(days=index),
                    count=snapshot.task_creation_trend.get(
                        trend_start.date() + timedelta(days=index),
                        0,
                    ),
                )
                for index in range(14)
            ],
        )

    @classmethod
    def _period_stats(cls, counts: PeriodCountRecord) -> DashboardPeriodStats:
        return DashboardPeriodStats(
            created=counts.created,
            completed=counts.completed,
            completion_rate=cls._percentage(counts.completed, counts.created),
        )

    @staticmethod
    def _percentage(value: int, total: int) -> float:
        if total == 0:
            return 0.0
        return round(value / total * 100, 1)
