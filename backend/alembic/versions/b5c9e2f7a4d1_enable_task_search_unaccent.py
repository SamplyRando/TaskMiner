"""enable accent-insensitive task search

Revision ID: b5c9e2f7a4d1
Revises: a3e7c1d9f5b2
Create Date: 2026-10-03 18:00:00.000000
"""

from collections.abc import Sequence

from alembic import op


revision: str = "b5c9e2f7a4d1"
down_revision: str | None = "a3e7c1d9f5b2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")


def downgrade() -> None:
    op.execute("DROP EXTENSION IF EXISTS unaccent")
