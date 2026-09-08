from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.models.workspace_subscription import WorkspaceSubscription
from app.subscriptions.plans import PlanCode, SubscriptionSource, SubscriptionStatus


class WorkspaceSubscriptionRepository:
    """Persistence queries used to resolve plans and enforce resource limits."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def create_free(self, workspace: Workspace) -> WorkspaceSubscription:
        subscription = WorkspaceSubscription(
            workspace=workspace,
            plan_code=PlanCode.FREE,
            status=SubscriptionStatus.ACTIVE,
            source=SubscriptionSource.INTERNAL,
        )
        self.session.add(subscription)
        return subscription

    def get_for_workspace(
        self,
        workspace_id: UUID,
        *,
        for_update: bool = False,
    ) -> WorkspaceSubscription | None:
        statement = select(WorkspaceSubscription).where(
            WorkspaceSubscription.workspace_id == workspace_id
        )
        if for_update:
            statement = statement.with_for_update()
        return self.session.scalar(statement)

    def lock_workspace(self, workspace_id: UUID) -> None:
        self.session.execute(
            select(Workspace.id)
            .where(
                Workspace.id == workspace_id,
                Workspace.deleted_at.is_(None),
            )
            .with_for_update()
        ).scalar_one()

    def lock_user(self, user_id: UUID) -> None:
        self.session.execute(
            select(User.id).where(User.id == user_id).with_for_update()
        ).scalar_one()

    def subscriptions_for_owned_workspaces(
        self,
        user_id: UUID,
    ) -> list[WorkspaceSubscription]:
        statement = (
            select(WorkspaceSubscription)
            .join(Workspace, WorkspaceSubscription.workspace_id == Workspace.id)
            .where(
                Workspace.owner_id == user_id,
                Workspace.deleted_at.is_(None),
            )
        )
        return list(self.session.scalars(statement).all())

    def count_owned_workspaces(self, user_id: UUID) -> int:
        statement = select(func.count(Workspace.id)).where(
            Workspace.owner_id == user_id,
            Workspace.deleted_at.is_(None),
        )
        return int(self.session.scalar(statement) or 0)

    def count_active_members(self, workspace_id: UUID) -> int:
        statement = (
            select(func.count(WorkspaceMember.id))
            .join(User, WorkspaceMember.user_id == User.id)
            .where(
                WorkspaceMember.workspace_id == workspace_id,
                User.is_active.is_(True),
                User.deleted_at.is_(None),
            )
        )
        return int(self.session.scalar(statement) or 0)

    def count_active_projects(self, workspace_id: UUID) -> int:
        statement = select(func.count(Project.id)).where(
            Project.workspace_id == workspace_id,
            Project.deleted_at.is_(None),
        )
        return int(self.session.scalar(statement) or 0)

    def update_plan(
        self,
        subscription: WorkspaceSubscription,
        plan: PlanCode,
        *,
        status: SubscriptionStatus = SubscriptionStatus.ACTIVE,
        period_start: datetime | None = None,
        period_end: datetime | None = None,
    ) -> WorkspaceSubscription:
        subscription.plan_code = plan
        subscription.status = status
        subscription.current_period_start = period_start
        subscription.current_period_end = period_end
        self.session.flush()
        return subscription

    def commit(self) -> None:
        self.session.commit()

    def rollback(self) -> None:
        self.session.rollback()
