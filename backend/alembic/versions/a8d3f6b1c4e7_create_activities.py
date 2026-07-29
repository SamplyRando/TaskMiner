"""create activities

Revision ID: a8d3f6b1c4e7
Revises: 7c4e1a9b2d6f
Create Date: 2026-07-29 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "a8d3f6b1c4e7"
down_revision: str | None = "7c4e1a9b2d6f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    event_type = postgresql.ENUM(
        "workspace_created",
        "workspace_updated",
        "project_created",
        "project_updated",
        "project_deleted",
        "task_created",
        "task_updated",
        "task_deleted",
        "task_assigned",
        "comment_created",
        "attachment_uploaded",
        "invitation_created",
        "invitation_accepted",
        "member_role_updated",
        name="activity_event_type",
    )
    resource_type = postgresql.ENUM(
        "workspace",
        "project",
        "task",
        "comment",
        "attachment",
        "invitation",
        "member",
        name="activity_resource_type",
    )
    op.create_table(
        "activities",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("actor_id", sa.UUID(), nullable=True),
        sa.Column("event_type", event_type, nullable=False),
        sa.Column("resource_type", resource_type, nullable=False),
        sa.Column("resource_id", sa.UUID(), nullable=False),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["actor_id"],
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
        op.f("ix_activities_actor_id"),
        "activities",
        ["actor_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_activities_created_at"),
        "activities",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_activities_event_type"),
        "activities",
        ["event_type"],
        unique=False,
    )
    op.create_index(
        op.f("ix_activities_workspace_id"),
        "activities",
        ["workspace_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_activities_workspace_id"), table_name="activities")
    op.drop_index(op.f("ix_activities_event_type"), table_name="activities")
    op.drop_index(op.f("ix_activities_created_at"), table_name="activities")
    op.drop_index(op.f("ix_activities_actor_id"), table_name="activities")
    op.drop_table("activities")
    postgresql.ENUM(name="activity_resource_type").drop(
        op.get_bind(),
        checkfirst=True,
    )
    postgresql.ENUM(name="activity_event_type").drop(
        op.get_bind(),
        checkfirst=True,
    )
