"""create workspace subscriptions

Revision ID: 3e8a1c7d5b9f
Revises: f4a7c9d2e6b1
Create Date: 2026-09-05 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "3e8a1c7d5b9f"
down_revision: str | None = "f4a7c9d2e6b1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "workspace_subscriptions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "plan_code",
            sa.String(length=4),
            server_default=sa.text("'free'"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=10),
            server_default=sa.text("'active'"),
            nullable=False,
        ),
        sa.Column(
            "source",
            sa.String(length=8),
            server_default=sa.text("'internal'"),
            nullable=False,
        ),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "cancel_at_period_end",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "plan_code IN ('free', 'pro')",
            name="workspace_subscription_plan_code",
        ),
        sa.CheckConstraint(
            "status IN ('active', 'inactive', 'canceled', 'past_due', "
            "'trialing', 'incomplete')",
            name="workspace_subscription_status",
        ),
        sa.CheckConstraint(
            "source IN ('internal', 'stripe')",
            name="workspace_subscription_source",
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "workspace_id",
            name="uq_workspace_subscriptions_workspace_id",
        ),
    )
    op.execute(
        sa.text(
            """
            INSERT INTO workspace_subscriptions (
                id,
                workspace_id,
                plan_code,
                status,
                source,
                cancel_at_period_end
            )
            SELECT
                gen_random_uuid(),
                id,
                'free',
                'active',
                'internal',
                false
            FROM workspaces
            WHERE deleted_at IS NULL
            """
        )
    )


def downgrade() -> None:
    op.drop_table("workspace_subscriptions")
