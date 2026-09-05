from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, UniqueConstraint, text
from sqlalchemy import Enum as SQLAlchemyEnum
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base
from app.models.mixins import TimestampMixin
from app.subscriptions.plans import PlanCode, SubscriptionSource, SubscriptionStatus

if TYPE_CHECKING:
    from app.models.workspace import Workspace


class WorkspaceSubscription(TimestampMixin, Base):
    """The single current subscription record for a workspace."""

    __tablename__ = "workspace_subscriptions"
    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            name="uq_workspace_subscriptions_workspace_id",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    workspace_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    plan_code: Mapped[PlanCode] = mapped_column(
        SQLAlchemyEnum(
            PlanCode,
            name="workspace_subscription_plan_code",
            native_enum=False,
            create_constraint=True,
            values_callable=lambda enum_class: [member.value for member in enum_class],
        ),
        nullable=False,
        default=PlanCode.FREE,
        server_default=text("'free'"),
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        SQLAlchemyEnum(
            SubscriptionStatus,
            name="workspace_subscription_status",
            native_enum=False,
            create_constraint=True,
            values_callable=lambda enum_class: [member.value for member in enum_class],
        ),
        nullable=False,
        default=SubscriptionStatus.ACTIVE,
        server_default=text("'active'"),
    )
    source: Mapped[SubscriptionSource] = mapped_column(
        SQLAlchemyEnum(
            SubscriptionSource,
            name="workspace_subscription_source",
            native_enum=False,
            create_constraint=True,
            values_callable=lambda enum_class: [member.value for member in enum_class],
        ),
        nullable=False,
        default=SubscriptionSource.INTERNAL,
        server_default=text("'internal'"),
    )
    current_period_start: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    current_period_end: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    cancel_at_period_end: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )

    workspace: Mapped[Workspace] = relationship(back_populates="subscription")
