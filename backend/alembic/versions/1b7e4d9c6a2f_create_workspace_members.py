"""create workspace members

Revision ID: 1b7e4d9c6a2f
Revises: 8e2b6f4a9c1d
Create Date: 2026-07-28 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "1b7e4d9c6a2f"
down_revision: str | None = "8e2b6f4a9c1d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    member_role = postgresql.ENUM("owner", name="workspace_member_role")
    op.create_table(
        "workspace_members",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column(
            "role",
            member_role,
            server_default=sa.text("'owner'"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
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
            "workspace_id",
            "user_id",
            name="uq_workspace_members_workspace_user",
        ),
    )
    op.create_index(
        op.f("ix_workspace_members_user_id"),
        "workspace_members",
        ["user_id"],
        unique=False,
    )

    op.execute(
        """
        INSERT INTO workspace_members (id, workspace_id, user_id, role)
        SELECT
            gen_random_uuid(),
            workspaces.id,
            workspaces.owner_id,
            'owner'::workspace_member_role
        FROM workspaces
        """
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_workspace_members_user_id"),
        table_name="workspace_members",
    )
    op.drop_table("workspace_members")
    postgresql.ENUM(name="workspace_member_role").drop(
        op.get_bind(),
        checkfirst=True,
    )
