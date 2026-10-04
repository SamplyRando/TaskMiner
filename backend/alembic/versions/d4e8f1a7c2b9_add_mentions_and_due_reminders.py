"""add comment mentions and due reminders

Revision ID: d4e8f1a7c2b9
Revises: c6d1e4f8a2b9
Create Date: 2026-10-04 12:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "d4e8f1a7c2b9"
down_revision: str | None = "c6d1e4f8a2b9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        op.f("ix_projects_due_date"),
        "projects",
        ["due_date"],
        unique=False,
    )
    op.add_column(
        "user_preferences",
        sa.Column(
            "notify_task_reminders",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
    )
    op.add_column(
        "user_preferences",
        sa.Column(
            "notify_project_reminders",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
    )
    op.add_column(
        "user_preferences",
        sa.Column(
            "reminder_lead_days",
            sa.Integer(),
            server_default=sa.text("2"),
            nullable=False,
        ),
    )
    op.create_check_constraint(
        "ck_user_preferences_reminder_lead_days",
        "user_preferences",
        "reminder_lead_days IN (1, 2, 3, 7)",
    )
    op.create_table(
        "comment_mentions",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("comment_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["comment_id"], ["comments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "comment_id",
            "user_id",
            name="uq_comment_mentions_comment_user",
        ),
    )
    op.create_index(
        op.f("ix_comment_mentions_comment_id"),
        "comment_mentions",
        ["comment_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_comment_mentions_user_id"),
        "comment_mentions",
        ["user_id"],
        unique=False,
    )
    op.create_table(
        "reminder_deliveries",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("recipient_user_id", sa.UUID(), nullable=False),
        sa.Column("entity_type", sa.String(length=32), nullable=False),
        sa.Column("entity_id", sa.UUID(), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("lead_days", sa.Integer(), nullable=False),
        sa.Column(
            "email_status",
            sa.String(length=16),
            server_default=sa.text("'pending'"),
            nullable=False,
        ),
        sa.Column("email_attempted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("email_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "email_status IN ('pending', 'sending', 'sent', 'failed')",
            name="ck_reminder_deliveries_email_status",
        ),
        sa.CheckConstraint(
            "entity_type IN ('task', 'project')",
            name="ck_reminder_deliveries_entity_type",
        ),
        sa.CheckConstraint(
            "lead_days IN (1, 2, 3, 7)",
            name="ck_reminder_deliveries_lead_days",
        ),
        sa.ForeignKeyConstraint(
            ["recipient_user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"], ["workspaces.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "recipient_user_id",
            "entity_type",
            "entity_id",
            "due_at",
            "lead_days",
            name="uq_reminder_deliveries_logical_delivery",
        ),
    )
    op.create_index(
        "ix_reminder_deliveries_recipient_created",
        "reminder_deliveries",
        ["recipient_user_id", "created_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_reminder_deliveries_recipient_user_id"),
        "reminder_deliveries",
        ["recipient_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_reminder_deliveries_workspace_id"),
        "reminder_deliveries",
        ["workspace_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_reminder_deliveries_workspace_id"),
        table_name="reminder_deliveries",
    )
    op.drop_index(
        op.f("ix_reminder_deliveries_recipient_user_id"),
        table_name="reminder_deliveries",
    )
    op.drop_index(
        "ix_reminder_deliveries_recipient_created",
        table_name="reminder_deliveries",
    )
    op.drop_table("reminder_deliveries")
    op.drop_index(op.f("ix_comment_mentions_user_id"), table_name="comment_mentions")
    op.drop_index(op.f("ix_comment_mentions_comment_id"), table_name="comment_mentions")
    op.drop_table("comment_mentions")
    op.drop_constraint(
        "ck_user_preferences_reminder_lead_days",
        "user_preferences",
        type_="check",
    )
    op.drop_column("user_preferences", "reminder_lead_days")
    op.drop_column("user_preferences", "notify_project_reminders")
    op.drop_column("user_preferences", "notify_task_reminders")
    op.drop_index(op.f("ix_projects_due_date"), table_name="projects")
    op.drop_column("projects", "due_date")
