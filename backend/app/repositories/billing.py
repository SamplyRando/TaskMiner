from datetime import datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models.stripe_webhook_event import StripeWebhookEvent
from app.models.workspace import Workspace
from app.models.workspace_subscription import WorkspaceSubscription


class BillingRepository:
    """Transactional persistence for Stripe state and webhook claims."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def get_for_workspace(
        self,
        workspace_id: UUID,
        *,
        for_update: bool = False,
    ) -> WorkspaceSubscription | None:
        statement = (
            select(WorkspaceSubscription)
            .join(Workspace, WorkspaceSubscription.workspace_id == Workspace.id)
            .where(
                WorkspaceSubscription.workspace_id == workspace_id,
                Workspace.deleted_at.is_(None),
            )
        )
        if for_update:
            statement = statement.with_for_update()
        return self.session.scalar(statement)

    def get_by_customer_id(
        self,
        customer_id: str,
    ) -> WorkspaceSubscription | None:
        return self.session.scalar(
            select(WorkspaceSubscription)
            .join(Workspace, WorkspaceSubscription.workspace_id == Workspace.id)
            .where(
                WorkspaceSubscription.stripe_customer_id == customer_id,
                Workspace.deleted_at.is_(None),
            )
        )

    def get_by_subscription_id(
        self,
        subscription_id: str,
    ) -> WorkspaceSubscription | None:
        return self.session.scalar(
            select(WorkspaceSubscription)
            .join(Workspace, WorkspaceSubscription.workspace_id == Workspace.id)
            .where(
                WorkspaceSubscription.stripe_subscription_id == subscription_id,
                Workspace.deleted_at.is_(None),
            )
        )

    def claim_event(
        self,
        event_id: str,
        event_type: str,
        stripe_created_at: datetime,
    ) -> bool:
        statement = (
            insert(StripeWebhookEvent)
            .values(
                event_id=event_id,
                event_type=event_type,
                stripe_created_at=stripe_created_at,
            )
            .on_conflict_do_nothing(index_elements=["event_id"])
            .returning(StripeWebhookEvent.id)
        )
        return self.session.scalar(statement) is not None

    def associate_event(self, event_id: str, workspace_id: UUID) -> None:
        self.session.execute(
            update(StripeWebhookEvent)
            .where(StripeWebhookEvent.event_id == event_id)
            .values(workspace_id=workspace_id)
        )

    def flush(self) -> None:
        self.session.flush()

    def refresh(self, subscription: WorkspaceSubscription) -> None:
        self.session.refresh(subscription)

    def commit(self) -> None:
        self.session.commit()

    def rollback(self) -> None:
        self.session.rollback()
