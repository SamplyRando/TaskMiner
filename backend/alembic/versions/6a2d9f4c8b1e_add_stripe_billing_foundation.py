"""add Stripe billing foundation

Revision ID: 6a2d9f4c8b1e
Revises: 3e8a1c7d5b9f
Create Date: 2026-09-06 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "6a2d9f4c8b1e"
down_revision: str | None = "3e8a1c7d5b9f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "workspace_subscriptions",
        sa.Column("stripe_customer_id", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "workspace_subscriptions",
        sa.Column("stripe_subscription_id", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "workspace_subscriptions",
        sa.Column("stripe_price_id", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "workspace_subscriptions",
        sa.Column(
            "stripe_event_created_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.create_unique_constraint(
        "uq_workspace_subscriptions_stripe_customer_id",
        "workspace_subscriptions",
        ["stripe_customer_id"],
    )
    op.create_unique_constraint(
        "uq_workspace_subscriptions_stripe_subscription_id",
        "workspace_subscriptions",
        ["stripe_subscription_id"],
    )

    op.create_table(
        "stripe_webhook_events",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("event_id", sa.String(length=255), nullable=False),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "stripe_created_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "processed_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "event_id",
            name="uq_stripe_webhook_events_event_id",
        ),
    )
    op.create_index(
        op.f("ix_stripe_webhook_events_workspace_id"),
        "stripe_webhook_events",
        ["workspace_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_stripe_webhook_events_workspace_id"),
        table_name="stripe_webhook_events",
    )
    op.drop_table("stripe_webhook_events")
    op.drop_constraint(
        "uq_workspace_subscriptions_stripe_subscription_id",
        "workspace_subscriptions",
        type_="unique",
    )
    op.drop_constraint(
        "uq_workspace_subscriptions_stripe_customer_id",
        "workspace_subscriptions",
        type_="unique",
    )
    op.drop_column("workspace_subscriptions", "stripe_event_created_at")
    op.drop_column("workspace_subscriptions", "stripe_price_id")
    op.drop_column("workspace_subscriptions", "stripe_subscription_id")
    op.drop_column("workspace_subscriptions", "stripe_customer_id")
