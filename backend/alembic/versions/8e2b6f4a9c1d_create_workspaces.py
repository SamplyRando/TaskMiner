"""create workspaces and migrate project ownership

Revision ID: 8e2b6f4a9c1d
Revises: 4c7d2a9e1f5b
Create Date: 2026-07-28 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "8e2b6f4a9c1d"
down_revision: str | None = "4c7d2a9e1f5b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "workspaces",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("owner_id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("name <> ''", name="ck_workspaces_name_not_empty"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_workspaces_deleted_at"),
        "workspaces",
        ["deleted_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_workspaces_owner_id"),
        "workspaces",
        ["owner_id"],
        unique=False,
    )

    op.add_column(
        "projects",
        sa.Column("workspace_id", sa.UUID(), nullable=True),
    )
    op.create_index(
        op.f("ix_projects_workspace_id"),
        "projects",
        ["workspace_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_projects_workspace_id_workspaces",
        "projects",
        "workspaces",
        ["workspace_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.execute(
        """
        INSERT INTO workspaces (id, name, description, owner_id)
        SELECT gen_random_uuid(), 'My Workspace', NULL, users.id
        FROM users
        """
    )
    op.execute(
        """
        UPDATE projects
        SET workspace_id = workspaces.id
        FROM workspaces
        WHERE workspaces.owner_id = projects.owner_id
        """
    )

    op.alter_column("projects", "workspace_id", nullable=False)
    op.drop_index(op.f("ix_projects_owner_id"), table_name="projects")
    op.drop_constraint("projects_owner_id_fkey", "projects", type_="foreignkey")
    op.drop_column("projects", "owner_id")


def downgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("owner_id", sa.UUID(), nullable=True),
    )
    op.execute(
        """
        UPDATE projects
        SET owner_id = workspaces.owner_id
        FROM workspaces
        WHERE workspaces.id = projects.workspace_id
        """
    )
    op.alter_column("projects", "owner_id", nullable=False)
    op.create_foreign_key(
        "projects_owner_id_fkey",
        "projects",
        "users",
        ["owner_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(
        op.f("ix_projects_owner_id"),
        "projects",
        ["owner_id"],
        unique=False,
    )

    op.drop_constraint(
        "fk_projects_workspace_id_workspaces",
        "projects",
        type_="foreignkey",
    )
    op.drop_index(op.f("ix_projects_workspace_id"), table_name="projects")
    op.drop_column("projects", "workspace_id")
    op.drop_index(op.f("ix_workspaces_owner_id"), table_name="workspaces")
    op.drop_index(op.f("ix_workspaces_deleted_at"), table_name="workspaces")
    op.drop_table("workspaces")
