from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.events import DomainEvent
from app.models.activity import Activity
from app.models.workspace import Workspace


class ActivityRepository:
    """Persistence operations for workspace activity entries."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, event: DomainEvent) -> Activity:
        activity = Activity(
            workspace_id=event.workspace_id,
            actor_id=event.actor_id,
            event_type=event.event_type,
            resource_type=event.resource_type,
            resource_id=event.resource_id,
            activity_metadata=event.metadata,
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
        offset: int,
        limit: int,
    ) -> tuple[list[Activity], int]:
        total_statement = select(func.count(Activity.id)).where(
            Activity.workspace_id == workspace.id
        )
        total = int(self.session.scalar(total_statement) or 0)
        statement = (
            select(Activity)
            .where(Activity.workspace_id == workspace.id)
            .order_by(Activity.created_at.desc(), Activity.id.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(self.session.scalars(statement).all()), total
