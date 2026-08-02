from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import String, cast, exists, func, literal, or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement

from app.core.activity_messages import ACTIVITY_EVENT_LABELS
from app.core.events import ActivityResourceType, DomainEvent
from app.models.audit_log import AuditLog
from app.models.project import Project
from app.models.task import Task
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.audit import AuditListParams, AuditPeriod


class AuditRepository:
    """Persistence operations for immutable workspace audit logs."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, event: DomainEvent) -> AuditLog:
        audit_log = AuditLog(
            id=event.id,
            workspace_id=event.workspace_id,
            actor_id=event.actor_id,
            event_type=event.event_type,
            resource_type=event.resource_type,
            resource_id=event.resource_id,
            old_values=event.old_values,
            new_values=event.new_values,
            audit_metadata=event.metadata,
            success=event.success,
            created_at=event.occurred_at,
        )
        self.session.add(audit_log)
        try:
            self.session.commit()
            self.session.refresh(audit_log)
        except SQLAlchemyError:
            self.session.rollback()
            raise
        return audit_log

    def list_workspace_logs(
        self,
        workspace: Workspace,
        *,
        params: AuditListParams,
    ) -> tuple[list[AuditLog], int]:
        filters = self._build_filters(workspace, params)
        total_statement = (
            select(func.count(AuditLog.id))
            .outerjoin(User, AuditLog.actor_id == User.id)
            .where(*filters)
        )
        total = int(self.session.scalar(total_statement) or 0)
        statement = (
            select(AuditLog)
            .outerjoin(User, AuditLog.actor_id == User.id)
            .where(*filters)
            .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
            .offset(params.offset)
            .limit(params.limit)
        )
        return list(self.session.scalars(statement).unique().all()), total

    def get_by_id(self, audit_id: UUID) -> AuditLog | None:
        return self.session.scalar(select(AuditLog).where(AuditLog.id == audit_id))

    def list_after(
        self,
        workspace: Workspace,
        audit_id: UUID,
        *,
        limit: int = 100,
    ) -> list[AuditLog]:
        marker = self.get_by_id(audit_id)
        if marker is None or marker.workspace_id != workspace.id:
            return []
        statement = (
            select(AuditLog)
            .where(
                AuditLog.workspace_id == workspace.id,
                or_(
                    AuditLog.created_at > marker.created_at,
                    (
                        (AuditLog.created_at == marker.created_at)
                        & (AuditLog.id > marker.id)
                    ),
                ),
            )
            .order_by(AuditLog.created_at.asc(), AuditLog.id.asc())
            .limit(limit)
        )
        return list(self.session.scalars(statement).unique().all())

    @staticmethod
    def _build_filters(
        workspace: Workspace,
        params: AuditListParams,
    ) -> list[ColumnElement[bool]]:
        filters: list[ColumnElement[bool]] = [AuditLog.workspace_id == workspace.id]
        if params.actor_id is not None:
            filters.append(AuditLog.actor_id == params.actor_id)
        if params.event_type is not None:
            filters.append(AuditLog.event_type == params.event_type)
        if params.resource_type is not None:
            filters.append(AuditLog.resource_type == params.resource_type)
        if params.success is not None:
            filters.append(AuditLog.success.is_(params.success))
        if params.period is not None:
            period_days = {
                AuditPeriod.TODAY: 1,
                AuditPeriod.WEEK: 7,
                AuditPeriod.MONTH: 30,
            }
            filters.append(
                AuditLog.created_at
                >= datetime.now(timezone.utc)
                - timedelta(days=period_days[params.period])
            )
        if params.search is not None:
            normalized_search = params.search.strip()
            pattern = f"%{normalized_search}%"
            referenced_task = or_(
                (
                    (AuditLog.resource_type == ActivityResourceType.TASK)
                    & (Task.id == AuditLog.resource_id)
                ),
                cast(Task.id, String) == AuditLog.audit_metadata["task_id"].astext,
            )
            referenced_project = or_(
                (
                    (AuditLog.resource_type == ActivityResourceType.PROJECT)
                    & (Project.id == AuditLog.resource_id)
                ),
                cast(Project.id, String)
                == AuditLog.audit_metadata["project_id"].astext,
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
                cast(AuditLog.resource_id, String).ilike(pattern),
                cast(AuditLog.audit_metadata, String).ilike(pattern),
                cast(AuditLog.old_values, String).ilike(pattern),
                cast(AuditLog.new_values, String).ilike(pattern),
                cast(AuditLog.event_type, String).ilike(pattern),
                cast(AuditLog.resource_type, String).ilike(pattern),
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
                search_conditions.append(AuditLog.event_type.in_(matching_events))
            if normalized_search.casefold() in "succès":
                search_conditions.append(AuditLog.success.is_(True))
            if normalized_search.casefold() in "échec":
                search_conditions.append(AuditLog.success.is_(False))
            filters.append(or_(*search_conditions))
        return filters
