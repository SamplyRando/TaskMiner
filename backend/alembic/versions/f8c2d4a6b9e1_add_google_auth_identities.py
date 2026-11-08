"""add Google authentication identities and one-time attempts

Revision ID: f8c2d4a6b9e1
Revises: e5f9a2b8d3c1
Create Date: 2026-11-08 10:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "f8c2d4a6b9e1"
down_revision: str | None = "e5f9a2b8d3c1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "external_auth_identities",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("provider_subject", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "provider IN ('google')",
            name="ck_external_auth_identities_provider",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "provider",
            "provider_subject",
            name="uq_external_auth_identities_provider_subject",
        ),
        sa.UniqueConstraint(
            "user_id",
            "provider",
            name="uq_external_auth_identities_user_provider",
        ),
    )
    op.create_index(
        "ix_external_auth_identities_user_id",
        "external_auth_identities",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "external_auth_attempts",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("purpose", sa.String(length=32), nullable=False),
        sa.Column("nonce_hash", sa.String(length=64), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "provider IN ('google')",
            name="ck_external_auth_attempts_provider",
        ),
        sa.CheckConstraint(
            "purpose IN ('authenticate', 'link')",
            name="ck_external_auth_attempts_purpose",
        ),
        sa.CheckConstraint(
            "nonce_hash <> ''",
            name="ck_external_auth_attempts_nonce_hash_not_empty",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_external_auth_attempts_nonce_hash",
        "external_auth_attempts",
        ["nonce_hash"],
        unique=True,
    )
    op.create_index(
        "ix_external_auth_attempts_user_id",
        "external_auth_attempts",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_external_auth_attempts_expires_consumed",
        "external_auth_attempts",
        ["expires_at", "consumed_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_external_auth_attempts_expires_consumed",
        table_name="external_auth_attempts",
    )
    op.drop_index(
        "ix_external_auth_attempts_user_id",
        table_name="external_auth_attempts",
    )
    op.drop_index(
        "ix_external_auth_attempts_nonce_hash",
        table_name="external_auth_attempts",
    )
    op.drop_table("external_auth_attempts")
    op.drop_index(
        "ix_external_auth_identities_user_id",
        table_name="external_auth_identities",
    )
    op.drop_table("external_auth_identities")
