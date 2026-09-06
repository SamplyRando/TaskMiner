"""add Stripe scheduled cancellation timestamp

Revision ID: c4f8a2d7e1b6
Revises: 6a2d9f4c8b1e
Create Date: 2026-09-06 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "c4f8a2d7e1b6"
down_revision: str | None = "6a2d9f4c8b1e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "workspace_subscriptions",
        sa.Column("cancel_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("workspace_subscriptions", "cancel_at")
