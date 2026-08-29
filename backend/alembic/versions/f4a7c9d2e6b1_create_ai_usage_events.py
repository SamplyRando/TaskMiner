"""create AI usage events

Revision ID: f4a7c9d2e6b1
Revises: c8f4a2d7e1b9
Create Date: 2026-08-27 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "f4a7c9d2e6b1"
down_revision: str | None = "c8f4a2d7e1b9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ai_usage_events",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("operation_type", sa.String(length=64), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("model", sa.String(length=255), nullable=False),
        sa.Column(
            "status",
            sa.String(length=16),
            server_default=sa.text("'started'"),
            nullable=False,
        ),
        sa.Column("input_tokens", sa.Integer(), nullable=True),
        sa.Column("output_tokens", sa.Integer(), nullable=True),
        sa.Column("total_tokens", sa.Integer(), nullable=True),
        sa.Column(
            "estimated_cost_usd",
            sa.Numeric(precision=18, scale=8),
            nullable=True,
        ),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("error_code", sa.String(length=64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('started', 'success', 'failed')",
            name="ck_ai_usage_events_status",
        ),
        sa.CheckConstraint(
            "input_tokens IS NULL OR input_tokens >= 0",
            name="ck_ai_usage_events_input_tokens_non_negative",
        ),
        sa.CheckConstraint(
            "output_tokens IS NULL OR output_tokens >= 0",
            name="ck_ai_usage_events_output_tokens_non_negative",
        ),
        sa.CheckConstraint(
            "total_tokens IS NULL OR total_tokens >= 0",
            name="ck_ai_usage_events_total_tokens_non_negative",
        ),
        sa.CheckConstraint(
            "estimated_cost_usd IS NULL OR estimated_cost_usd >= 0",
            name="ck_ai_usage_events_cost_non_negative",
        ),
        sa.CheckConstraint(
            "latency_ms IS NULL OR latency_ms >= 0",
            name="ck_ai_usage_events_latency_non_negative",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_ai_usage_events_created_at",
        "ai_usage_events",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        "ix_ai_usage_events_operation_type",
        "ai_usage_events",
        ["operation_type"],
        unique=False,
    )
    op.create_index(
        "ix_ai_usage_events_status",
        "ai_usage_events",
        ["status"],
        unique=False,
    )
    op.create_index(
        "ix_ai_usage_events_user_created",
        "ai_usage_events",
        ["user_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_ai_usage_events_user_id",
        "ai_usage_events",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_ai_usage_events_workspace_created",
        "ai_usage_events",
        ["workspace_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_ai_usage_events_workspace_id",
        "ai_usage_events",
        ["workspace_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_ai_usage_events_workspace_id",
        table_name="ai_usage_events",
    )
    op.drop_index(
        "ix_ai_usage_events_workspace_created",
        table_name="ai_usage_events",
    )
    op.drop_index("ix_ai_usage_events_user_id", table_name="ai_usage_events")
    op.drop_index(
        "ix_ai_usage_events_user_created",
        table_name="ai_usage_events",
    )
    op.drop_index("ix_ai_usage_events_status", table_name="ai_usage_events")
    op.drop_index(
        "ix_ai_usage_events_operation_type",
        table_name="ai_usage_events",
    )
    op.drop_index("ix_ai_usage_events_created_at", table_name="ai_usage_events")
    op.drop_table("ai_usage_events")
