"""create in-app notifications

Revision ID: c6d1e4f8a2b9
Revises: b5c9e2f7a4d1
Create Date: 2026-10-03 20:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "c6d1e4f8a2b9"
down_revision: str | None = "b5c9e2f7a4d1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("recipient_user_id", sa.UUID(), nullable=False),
        sa.Column("actor_user_id", sa.UUID(), nullable=True),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.String(length=64), nullable=True),
        sa.Column("entity_id", sa.UUID(), nullable=True),
        sa.Column("source_event_id", sa.UUID(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["actor_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["recipient_user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "source_event_id",
            "recipient_user_id",
            "type",
            name="uq_notifications_source_recipient_type",
        ),
    )
    op.create_index(
        "ix_notifications_recipient_created_at",
        "notifications",
        ["recipient_user_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_notifications_recipient_read_created",
        "notifications",
        ["recipient_user_id", "read_at", "created_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_notifications_workspace_id"),
        "notifications",
        ["workspace_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_notifications_workspace_id"),
        table_name="notifications",
    )
    op.drop_index(
        "ix_notifications_recipient_read_created",
        table_name="notifications",
    )
    op.drop_index(
        "ix_notifications_recipient_created_at",
        table_name="notifications",
    )
    op.drop_table("notifications")
