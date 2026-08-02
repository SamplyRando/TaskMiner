"""add audit result

Revision ID: f1b2c3d4e5a6
Revises: e4a6c8f2b1d3
Create Date: 2026-08-02 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "f1b2c3d4e5a6"
down_revision: str | None = "e4a6c8f2b1d3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "audit_logs",
        sa.Column(
            "success",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
    )
    op.create_index(
        op.f("ix_audit_logs_success"),
        "audit_logs",
        ["success"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_audit_logs_success"), table_name="audit_logs")
    op.drop_column("audit_logs", "success")
