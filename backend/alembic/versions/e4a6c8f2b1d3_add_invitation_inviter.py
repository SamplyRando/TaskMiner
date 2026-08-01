"""add invitation inviter

Revision ID: e4a6c8f2b1d3
Revises: d2f7a4c9e1b6
Create Date: 2026-08-01 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "e4a6c8f2b1d3"
down_revision: str | None = "d2f7a4c9e1b6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "workspace_invitations",
        sa.Column("invited_by_id", sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        "fk_workspace_invitations_invited_by_id_users",
        "workspace_invitations",
        "users",
        ["invited_by_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        op.f("ix_workspace_invitations_invited_by_id"),
        "workspace_invitations",
        ["invited_by_id"],
        unique=False,
    )
    op.execute(
        """
        UPDATE workspace_invitations AS invitation
        SET invited_by_id = COALESCE(
            (
                SELECT activity.actor_id
                FROM activities AS activity
                WHERE activity.resource_id = invitation.id
                  AND activity.event_type = 'invitation_created'
                ORDER BY activity.created_at ASC
                LIMIT 1
            ),
            workspace.owner_id
        )
        FROM workspaces AS workspace
        WHERE workspace.id = invitation.workspace_id
        """
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_workspace_invitations_invited_by_id"),
        table_name="workspace_invitations",
    )
    op.drop_constraint(
        "fk_workspace_invitations_invited_by_id_users",
        "workspace_invitations",
        type_="foreignkey",
    )
    op.drop_column("workspace_invitations", "invited_by_id")
