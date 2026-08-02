"""add user settings

Revision ID: c3d9e1f7a2b4
Revises: f1b2c3d4e5a6
Create Date: 2026-08-02 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c3d9e1f7a2b4"
down_revision: str | None = "f1b2c3d4e5a6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    user_theme = postgresql.ENUM("light", "dark", "system", name="user_theme")
    user_motion = postgresql.ENUM("full", "reduced", name="user_motion")
    user_accent = postgresql.ENUM(
        "violet", "blue", "green", "orange", name="user_accent"
    )
    op.add_column("users", sa.Column("avatar_url", sa.String(2048), nullable=True))
    op.add_column(
        "users", sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "users", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "users",
        sa.Column(
            "auth_version", sa.Integer(), server_default=sa.text("0"), nullable=False
        ),
    )
    op.create_index(op.f("ix_users_deleted_at"), "users", ["deleted_at"])

    op.create_table(
        "user_preferences",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "theme", user_theme, server_default=sa.text("'system'"), nullable=False
        ),
        sa.Column(
            "motion", user_motion, server_default=sa.text("'full'"), nullable=False
        ),
        sa.Column(
            "items_per_page",
            sa.Integer(),
            server_default=sa.text("20"),
            nullable=False,
        ),
        sa.Column(
            "dashboard_period",
            sa.Integer(),
            server_default=sa.text("30"),
            nullable=False,
        ),
        sa.Column(
            "accent", user_accent, server_default=sa.text("'violet'"), nullable=False
        ),
        sa.Column(
            "notify_activity_feed",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column(
            "notify_audit",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column(
            "notify_invitations",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column(
            "notify_comments",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column(
            "notify_assignments",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "dashboard_period IN (7, 30, 90)",
            name="ck_user_preferences_dashboard_period",
        ),
        sa.CheckConstraint(
            "items_per_page IN (10, 20, 50, 100)",
            name="ck_user_preferences_items_per_page",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.execute(
        """
        INSERT INTO user_preferences (id, user_id)
        SELECT gen_random_uuid(), id FROM users
        """
    )


def downgrade() -> None:
    op.drop_table("user_preferences")
    op.drop_index(op.f("ix_users_deleted_at"), table_name="users")
    op.drop_column("users", "auth_version")
    op.drop_column("users", "deleted_at")
    op.drop_column("users", "last_login_at")
    op.drop_column("users", "avatar_url")
    postgresql.ENUM(name="user_accent").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="user_motion").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="user_theme").drop(op.get_bind(), checkfirst=True)
