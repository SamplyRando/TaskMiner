"""add billing Checkout consent evidence

Revision ID: f2a8c4d6e1b3
Revises: e9c2a7b4d6f1
Create Date: 2026-09-12 16:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "f2a8c4d6e1b3"
down_revision: str | None = "e9c2a7b4d6f1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "billing_checkout_consents",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "checkout_attempt_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("consent_type", sa.String(length=64), nullable=False),
        sa.Column("text_version", sa.String(length=32), nullable=False),
        sa.Column(
            "accepted_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
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
        sa.UniqueConstraint(
            "workspace_id",
            "checkout_attempt_id",
            "consent_type",
            name="uq_billing_checkout_consents_attempt_type",
        ),
    )
    op.create_index(
        "ix_billing_checkout_consents_workspace_accepted",
        "billing_checkout_consents",
        ["workspace_id", "accepted_at"],
        unique=False,
    )
    op.create_index(
        "ix_billing_checkout_consents_user_id",
        "billing_checkout_consents",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_billing_checkout_consents_user_id",
        table_name="billing_checkout_consents",
    )
    op.drop_index(
        "ix_billing_checkout_consents_workspace_accepted",
        table_name="billing_checkout_consents",
    )
    op.drop_table("billing_checkout_consents")
