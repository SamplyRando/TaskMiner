"""add durable owner scope for Free AI quota

Revision ID: a3e7c1d9f5b2
Revises: f2a8c4d6e1b3
Create Date: 2026-10-03 12:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "a3e7c1d9f5b2"
down_revision: str | None = "f2a8c4d6e1b3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "ai_usage_events",
        sa.Column(
            "free_quota_owner_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_ai_usage_events_free_quota_owner_id_users",
        "ai_usage_events",
        "users",
        ["free_quota_owner_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.execute(
        """
        UPDATE ai_usage_events AS event
        SET free_quota_owner_id = workspace.owner_id
        FROM workspaces AS workspace
        WHERE event.workspace_id = workspace.id
          AND NOT EXISTS (
              SELECT 1
              FROM workspace_subscriptions AS subscription
              WHERE subscription.workspace_id = workspace.id
                AND subscription.plan_code = 'pro'
                AND subscription.status IN ('active', 'trialing')
          )
        """
    )
    op.create_index(
        "ix_ai_usage_events_free_owner_created",
        "ai_usage_events",
        ["free_quota_owner_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_ai_usage_events_free_owner_created",
        table_name="ai_usage_events",
    )
    op.drop_constraint(
        "fk_ai_usage_events_free_quota_owner_id_users",
        "ai_usage_events",
        type_="foreignkey",
    )
    op.drop_column("ai_usage_events", "free_quota_owner_id")
