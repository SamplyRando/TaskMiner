"""add invitation email delivery tracking

Revision ID: c8f4a2d7e1b9
Revises: b6e8f1a3c5d7
Create Date: 2026-08-23 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c8f4a2d7e1b9"
down_revision: str | None = "b6e8f1a3c5d7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


invitation_email_delivery_status = postgresql.ENUM(
    "pending",
    "sent",
    "failed",
    "skipped",
    name="invitation_email_delivery_status",
    create_type=False,
)


def upgrade() -> None:
    invitation_email_delivery_status.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "workspace_invitations",
        sa.Column(
            "email_delivery_status",
            invitation_email_delivery_status,
            server_default=sa.text("'pending'"),
            nullable=False,
        ),
    )
    op.add_column(
        "workspace_invitations",
        sa.Column("email_last_attempted_at", sa.DateTime(timezone=True)),
    )
    op.add_column(
        "workspace_invitations",
        sa.Column("email_sent_at", sa.DateTime(timezone=True)),
    )


def downgrade() -> None:
    op.drop_column("workspace_invitations", "email_sent_at")
    op.drop_column("workspace_invitations", "email_last_attempted_at")
    op.drop_column("workspace_invitations", "email_delivery_status")
    invitation_email_delivery_status.drop(op.get_bind(), checkfirst=True)
