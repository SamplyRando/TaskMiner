"""add soft delete to projects and tasks

Revision ID: 2a6e1d9f4c3b
Revises: 7bcc87d93d5b
Create Date: 2026-07-27 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "2a6e1d9f4c3b"
down_revision: str | None = "7bcc87d93d5b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        op.f("ix_projects_deleted_at"),
        "projects",
        ["deleted_at"],
        unique=False,
    )
    op.add_column(
        "tasks",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        op.f("ix_tasks_deleted_at"),
        "tasks",
        ["deleted_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_tasks_deleted_at"), table_name="tasks")
    op.drop_column("tasks", "deleted_at")
    op.drop_index(op.f("ix_projects_deleted_at"), table_name="projects")
    op.drop_column("projects", "deleted_at")
