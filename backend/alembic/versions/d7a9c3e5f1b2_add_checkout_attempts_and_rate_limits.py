"""add durable Checkout attempts and shared request rate limits

Revision ID: d7a9c3e5f1b2
Revises: c4f8a2d7e1b6
Create Date: 2026-09-09 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "d7a9c3e5f1b2"
down_revision: str | None = "c4f8a2d7e1b6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "workspace_subscriptions",
        sa.Column("checkout_attempt_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "workspace_subscriptions",
        sa.Column(
            "checkout_attempt_started_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.add_column(
        "workspace_subscriptions",
        sa.Column("stripe_checkout_session_id", sa.String(255), nullable=True),
    )
    op.add_column(
        "workspace_subscriptions",
        sa.Column("stripe_checkout_url", sa.Text(), nullable=True),
    )
    op.add_column(
        "workspace_subscriptions",
        sa.Column(
            "stripe_checkout_expires_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.create_unique_constraint(
        "uq_workspace_subscriptions_stripe_checkout_session_id",
        "workspace_subscriptions",
        ["stripe_checkout_session_id"],
    )

    op.create_table(
        "request_rate_limit_buckets",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("action", sa.String(64), nullable=False),
        sa.Column("scope_type", sa.String(32), nullable=False),
        sa.Column("scope_hash", sa.String(64), nullable=False),
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("request_count", sa.Integer(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "request_count > 0",
            name="ck_request_rate_limit_buckets_count_positive",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "action",
            "scope_type",
            "scope_hash",
            "window_start",
            name="uq_request_rate_limit_bucket_scope_window",
        ),
    )
    op.create_index(
        "ix_request_rate_limit_buckets_window_start",
        "request_rate_limit_buckets",
        ["window_start"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_request_rate_limit_buckets_window_start",
        table_name="request_rate_limit_buckets",
    )
    op.drop_table("request_rate_limit_buckets")
    op.drop_constraint(
        "uq_workspace_subscriptions_stripe_checkout_session_id",
        "workspace_subscriptions",
        type_="unique",
    )
    op.drop_column("workspace_subscriptions", "stripe_checkout_expires_at")
    op.drop_column("workspace_subscriptions", "stripe_checkout_url")
    op.drop_column("workspace_subscriptions", "stripe_checkout_session_id")
    op.drop_column("workspace_subscriptions", "checkout_attempt_started_at")
    op.drop_column("workspace_subscriptions", "checkout_attempt_id")
