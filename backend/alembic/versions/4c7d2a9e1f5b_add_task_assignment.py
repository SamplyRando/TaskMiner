"""add task assignment

Revision ID: 4c7d2a9e1f5b
Revises: 9f3c1e8a6b2d
Create Date: 2026-07-28 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "4c7d2a9e1f5b"
down_revision: str | None = "9f3c1e8a6b2d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "tasks",
        sa.Column("assigned_user_id", sa.UUID(), nullable=True),
    )
    op.create_index(
        op.f("ix_tasks_assigned_user_id"),
        "tasks",
        ["assigned_user_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_tasks_assigned_user_id_users",
        "tasks",
        "users",
        ["assigned_user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_tasks_assigned_user_id_users",
        "tasks",
        type_="foreignkey",
    )
    op.drop_index(op.f("ix_tasks_assigned_user_id"), table_name="tasks")
    op.drop_column("tasks", "assigned_user_id")
