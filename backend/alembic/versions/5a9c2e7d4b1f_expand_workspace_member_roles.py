"""expand workspace member roles

Revision ID: 5a9c2e7d4b1f
Revises: 1b7e4d9c6a2f
Create Date: 2026-07-29 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op


revision: str = "5a9c2e7d4b1f"
down_revision: str | None = "1b7e4d9c6a2f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE workspace_members ALTER COLUMN role DROP DEFAULT")
    op.execute(
        """
        CREATE TYPE workspace_member_role_v2 AS ENUM (
            'owner', 'admin', 'member', 'viewer'
        )
        """
    )
    op.execute(
        """
        ALTER TABLE workspace_members
        ALTER COLUMN role TYPE workspace_member_role_v2
        USING role::text::workspace_member_role_v2
        """
    )
    op.execute("DROP TYPE workspace_member_role")
    op.execute("ALTER TYPE workspace_member_role_v2 RENAME TO workspace_member_role")
    op.execute(
        """
        ALTER TABLE workspace_members
        ALTER COLUMN role SET DEFAULT 'owner'
        """
    )


def downgrade() -> None:
    op.execute("UPDATE workspace_members SET role = 'owner' WHERE role <> 'owner'")
    op.execute("ALTER TABLE workspace_members ALTER COLUMN role DROP DEFAULT")
    op.execute("CREATE TYPE workspace_member_role_v1 AS ENUM ('owner')")
    op.execute(
        """
        ALTER TABLE workspace_members
        ALTER COLUMN role TYPE workspace_member_role_v1
        USING role::text::workspace_member_role_v1
        """
    )
    op.execute("DROP TYPE workspace_member_role")
    op.execute("ALTER TYPE workspace_member_role_v1 RENAME TO workspace_member_role")
    op.execute(
        """
        ALTER TABLE workspace_members
        ALTER COLUMN role SET DEFAULT 'owner'
        """
    )
