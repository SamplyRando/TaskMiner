"""create workspace invitations

Revision ID: 7c4e1a9b2d6f
Revises: 5a9c2e7d4b1f
Create Date: 2026-07-29 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "7c4e1a9b2d6f"
down_revision: str | None = "5a9c2e7d4b1f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    invitation_status = postgresql.ENUM(
        "pending",
        "accepted",
        "expired",
        "revoked",
        name="workspace_invitation_status",
    )
    member_role = postgresql.ENUM(
        "owner",
        "admin",
        "member",
        "viewer",
        name="workspace_member_role",
        create_type=False,
    )
    op.create_table(
        "workspace_invitations",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("role", member_role, nullable=False),
        sa.Column("token", sa.String(length=255), nullable=False),
        sa.Column(
            "status",
            invitation_status,
            server_default=sa.text("'pending'"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.CheckConstraint(
            "email <> ''",
            name="ck_workspace_invitations_email_not_empty",
        ),
        sa.CheckConstraint(
            "token <> ''",
            name="ck_workspace_invitations_token_not_empty",
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_workspace_invitations_email"),
        "workspace_invitations",
        ["email"],
        unique=False,
    )
    op.create_index(
        op.f("ix_workspace_invitations_status"),
        "workspace_invitations",
        ["status"],
        unique=False,
    )
    op.create_index(
        op.f("ix_workspace_invitations_token"),
        "workspace_invitations",
        ["token"],
        unique=True,
    )
    op.create_index(
        op.f("ix_workspace_invitations_workspace_id"),
        "workspace_invitations",
        ["workspace_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_workspace_invitations_workspace_id"),
        table_name="workspace_invitations",
    )
    op.drop_index(
        op.f("ix_workspace_invitations_token"),
        table_name="workspace_invitations",
    )
    op.drop_index(
        op.f("ix_workspace_invitations_status"),
        table_name="workspace_invitations",
    )
    op.drop_index(
        op.f("ix_workspace_invitations_email"),
        table_name="workspace_invitations",
    )
    op.drop_table("workspace_invitations")
    postgresql.ENUM(name="workspace_invitation_status").drop(
        op.get_bind(),
        checkfirst=True,
    )
