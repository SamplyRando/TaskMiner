"""add project workflows and workspace recovery support

Revision ID: e5f9a2b8d3c1
Revises: d4e8f1a7c2b9
Create Date: 2026-10-04 18:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "e5f9a2b8d3c1"
down_revision: str | None = "d4e8f1a7c2b9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "project_task_statuses",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("label", sa.String(length=100), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column(
            "is_completed",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.CheckConstraint("key <> ''", name="ck_project_task_statuses_key_not_empty"),
        sa.CheckConstraint(
            "label <> ''", name="ck_project_task_statuses_label_not_empty"
        ),
        sa.CheckConstraint("position >= 0", name="ck_project_task_statuses_position"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "project_id",
            "key",
            name="uq_project_task_statuses_project_key",
        ),
        sa.UniqueConstraint(
            "project_id",
            "position",
            name="uq_project_task_statuses_project_position",
        ),
    )
    op.create_index(
        op.f("ix_project_task_statuses_project_id"),
        "project_task_statuses",
        ["project_id"],
        unique=False,
    )
    op.create_index(
        "uq_project_task_statuses_completed",
        "project_task_statuses",
        ["project_id"],
        unique=True,
        postgresql_where=sa.text("is_completed"),
    )
    op.execute(
        """
        INSERT INTO project_task_statuses
            (id, project_id, key, label, position, is_completed)
        SELECT gen_random_uuid(), id, 'todo', 'À faire', 0, false FROM projects
        UNION ALL
        SELECT gen_random_uuid(), id, 'in_progress', 'En cours', 1, false FROM projects
        UNION ALL
        SELECT gen_random_uuid(), id, 'done', 'Terminée', 2, true FROM projects
        """
    )

    op.alter_column("tasks", "status", server_default=None)
    op.execute(
        "ALTER TABLE tasks ALTER COLUMN status TYPE VARCHAR(64) USING status::text"
    )
    op.alter_column(
        "tasks",
        "status",
        existing_type=sa.String(length=64),
        server_default=sa.text("'todo'"),
        existing_nullable=False,
    )
    op.create_foreign_key(
        "fk_tasks_project_status",
        "tasks",
        "project_task_statuses",
        ["project_id", "status"],
        ["project_id", "key"],
        ondelete="RESTRICT",
    )
    postgresql.ENUM(name="task_status").drop(op.get_bind(), checkfirst=True)


def downgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM tasks
            WHERE status NOT IN ('todo', 'in_progress', 'done')
          ) THEN
            RAISE EXCEPTION
              'Cannot downgrade while tasks use custom project statuses';
          END IF;
        END $$;
        """
    )
    task_status = postgresql.ENUM("todo", "in_progress", "done", name="task_status")
    task_status.create(op.get_bind(), checkfirst=True)
    op.drop_constraint("fk_tasks_project_status", "tasks", type_="foreignkey")
    op.alter_column("tasks", "status", server_default=None)
    op.execute(
        "ALTER TABLE tasks ALTER COLUMN status TYPE task_status "
        "USING status::task_status"
    )
    op.alter_column(
        "tasks",
        "status",
        existing_type=task_status,
        server_default=sa.text("'todo'::task_status"),
        existing_nullable=False,
    )
    op.drop_index(
        "uq_project_task_statuses_completed",
        table_name="project_task_statuses",
    )
    op.drop_index(
        op.f("ix_project_task_statuses_project_id"),
        table_name="project_task_statuses",
    )
    op.drop_table("project_task_statuses")
