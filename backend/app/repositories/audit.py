from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.events import (
    ActivityEventType,
    ActivityResourceType,
    DomainEvent,
)
from app.models.audit_log import AuditLog
from app.models.workspace import Workspace


class AuditRepository:
    """Persistence operations for immutable workspace audit logs."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, event: DomainEvent) -> AuditLog:
        audit_log = AuditLog(
            workspace_id=event.workspace_id,
            actor_id=event.actor_id,
            event_type=event.event_type,
            resource_type=event.resource_type,
            resource_id=event.resource_id,
            old_values=event.old_values,
            new_values=event.new_values,
            audit_metadata=event.metadata,
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
        offset: int,
        limit: int,
        event_type: ActivityEventType | None,
        resource_type: ActivityResourceType | None,
    ) -> tuple[list[AuditLog], int]:
        filters = [AuditLog.workspace_id == workspace.id]
        if event_type is not None:
            filters.append(AuditLog.event_type == event_type)
        if resource_type is not None:
            filters.append(AuditLog.resource_type == resource_type)

        total_statement = select(func.count(AuditLog.id)).where(*filters)
        total = int(self.session.scalar(total_statement) or 0)
        statement = (
            select(AuditLog)
            .where(*filters)
            .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(self.session.scalars(statement).all()), total
