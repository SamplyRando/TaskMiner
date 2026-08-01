from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import String, cast, exists, func, literal, or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement

from app.core.activity_messages import ACTIVITY_EVENT_LABELS
from app.core.events import ActivityResourceType, DomainEvent
from app.models.activity import Activity
from app.models.project import Project
from app.models.task import Task
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.activity import ActivityListParams, ActivityPeriod


class ActivityRepository:
    """Persistence operations for workspace activity entries."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, event: DomainEvent) -> Activity:
        activity = Activity(
            id=event.id,
            workspace_id=event.workspace_id,
            actor_id=event.actor_id,
            event_type=event.event_type,
            resource_type=event.resource_type,
            resource_id=event.resource_id,
            activity_metadata=event.metadata,
            created_at=event.occurred_at,
        )
        self.session.add(activity)
        try:
            self.session.commit()
            self.session.refresh(activity)
        except SQLAlchemyError:
            self.session.rollback()
            raise
        return activity

    def list_workspace_feed(
        self,
        workspace: Workspace,
        *,
        params: ActivityListParams,
    ) -> tuple[list[Activity], int]:
        filters = self._build_filters(workspace, params)
        total_statement = (
            select(func.count(Activity.id))
            .outerjoin(User, Activity.actor_id == User.id)
            .where(*filters)
        )
        total = int(self.session.scalar(total_statement) or 0)
        statement = (
            select(Activity)
            .outerjoin(User, Activity.actor_id == User.id)
            .where(*filters)
            .order_by(Activity.created_at.desc(), Activity.id.desc())
            .offset(params.offset)
            .limit(params.limit)
        )
        return list(self.session.scalars(statement).unique().all()), total

    def get_by_id(self, activity_id: UUID) -> Activity | None:
        return self.session.scalar(select(Activity).where(Activity.id == activity_id))

    def list_after(
        self,
        workspace: Workspace,
        activity_id: UUID,
        *,
        limit: int = 100,
    ) -> list[Activity]:
        marker = self.get_by_id(activity_id)
        if marker is None or marker.workspace_id != workspace.id:
            return []
        statement = (
            select(Activity)
            .where(
                Activity.workspace_id == workspace.id,
                or_(
                    Activity.created_at > marker.created_at,
                    (
                        (Activity.created_at == marker.created_at)
                        & (Activity.id > marker.id)
                    ),
                ),
            )
            .order_by(Activity.created_at.asc(), Activity.id.asc())
            .limit(limit)
        )
        return list(self.session.scalars(statement).unique().all())

    @staticmethod
    def _build_filters(
        workspace: Workspace,
        params: ActivityListParams,
    ) -> list[ColumnElement[bool]]:
        filters: list[ColumnElement[bool]] = [Activity.workspace_id == workspace.id]
        if params.actor_id is not None:
            filters.append(Activity.actor_id == params.actor_id)
        if params.event_type is not None:
            filters.append(Activity.event_type == params.event_type)
        if params.period is not None:
            period_days = {
                ActivityPeriod.TODAY: 1,
                ActivityPeriod.WEEK: 7,
                ActivityPeriod.MONTH: 30,
            }
            filters.append(
                Activity.created_at
                >= datetime.now(timezone.utc)
                - timedelta(days=period_days[params.period])
            )
        if params.search is not None:
            normalized_search = params.search.strip()
            pattern = f"%{normalized_search}%"
            referenced_task = or_(
                (
                    (Activity.resource_type == ActivityResourceType.TASK)
                    & (Task.id == Activity.resource_id)
                ),
                cast(Task.id, String) == Activity.activity_metadata["task_id"].astext,
            )
            referenced_project = or_(
                (
                    (Activity.resource_type == ActivityResourceType.PROJECT)
                    & (Project.id == Activity.resource_id)
                ),
                cast(Project.id, String)
                == Activity.activity_metadata["project_id"].astext,
                exists(
                    select(Task.id).where(
                        Task.project_id == Project.id,
                        referenced_task,
                    )
                ),
            )
            matching_events = [
                event_type
                for event_type, label in ACTIVITY_EVENT_LABELS.items()
                if normalized_search.casefold() in label.casefold()
            ]
            search_conditions: list[ColumnElement[bool]] = [
                User.full_name.ilike(pattern),
                User.email.ilike(pattern),
                cast(Activity.activity_metadata, String).ilike(pattern),
                cast(Activity.event_type, String).ilike(pattern),
                cast(Activity.resource_type, String).ilike(pattern),
                literal(workspace.name).ilike(pattern),
                exists(
                    select(Project.id).where(
                        Project.workspace_id == workspace.id,
                        referenced_project,
                        Project.name.ilike(pattern),
                    )
                ),
                exists(
                    select(Task.id)
                    .join(Project, Task.project_id == Project.id)
                    .where(
                        Project.workspace_id == workspace.id,
                        referenced_task,
                        Task.title.ilike(pattern),
                    )
                ),
            ]
            if matching_events:
                search_conditions.append(Activity.event_type.in_(matching_events))
            filters.append(or_(*search_conditions))
        return filters
