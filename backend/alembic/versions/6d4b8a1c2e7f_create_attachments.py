"""create attachments

Revision ID: 6d4b8a1c2e7f
Revises: 2a6e1d9f4c3b
Create Date: 2026-07-27 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "6d4b8a1c2e7f"
down_revision: str | None = "2a6e1d9f4c3b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "attachments",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("stored_filename", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=255), nullable=False),
        sa.Column("file_size", sa.BigInteger(), nullable=False),
        sa.Column("task_id", sa.UUID(), nullable=False),
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
        sa.CheckConstraint(
            "file_size >= 0",
            name="ck_attachments_file_size_non_negative",
        ),
        sa.CheckConstraint(
            "filename <> ''",
            name="ck_attachments_filename_not_empty",
        ),
        sa.CheckConstraint(
            "stored_filename <> ''",
            name="ck_attachments_stored_filename_not_empty",
        ),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("stored_filename"),
    )
    op.create_index(
        op.f("ix_attachments_deleted_at"),
        "attachments",
        ["deleted_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_attachments_task_id"),
        "attachments",
        ["task_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_attachments_task_id"), table_name="attachments")
    op.drop_index(op.f("ix_attachments_deleted_at"), table_name="attachments")
    op.drop_table("attachments")
