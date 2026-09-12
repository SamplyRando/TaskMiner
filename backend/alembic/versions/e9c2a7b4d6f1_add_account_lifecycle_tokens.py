"""add account lifecycle tokens

Revision ID: e9c2a7b4d6f1
Revises: d7a9c3e5f1b2
Create Date: 2026-09-12 10:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "e9c2a7b4d6f1"
down_revision: str | None = "d7a9c3e5f1b2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        """
        UPDATE users
        SET email_verified_at = created_at
        WHERE email_verified_at IS NULL
        """
    )
    op.create_table(
        "account_action_tokens",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("purpose", sa.String(length=32), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("issued_auth_version", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "purpose IN ('email_verification', 'password_reset')",
            name="ck_account_action_tokens_purpose",
        ),
        sa.CheckConstraint(
            "token_hash <> ''",
            name="ck_account_action_tokens_hash_not_empty",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_account_action_tokens_user_id",
        "account_action_tokens",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_account_action_tokens_token_hash",
        "account_action_tokens",
        ["token_hash"],
        unique=True,
    )
    op.create_index(
        "ix_account_action_tokens_expires_at",
        "account_action_tokens",
        ["expires_at"],
        unique=False,
    )
    op.create_index(
        "ix_account_action_tokens_user_purpose_created",
        "account_action_tokens",
        ["user_id", "purpose", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_account_action_tokens_user_purpose_created",
        table_name="account_action_tokens",
    )
    op.drop_index(
        "ix_account_action_tokens_expires_at",
        table_name="account_action_tokens",
    )
    op.drop_index(
        "ix_account_action_tokens_token_hash",
        table_name="account_action_tokens",
    )
    op.drop_index(
        "ix_account_action_tokens_user_id",
        table_name="account_action_tokens",
    )
    op.drop_table("account_action_tokens")
    op.drop_column("users", "email_verified_at")
