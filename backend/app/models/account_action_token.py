from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Literal
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base

if TYPE_CHECKING:
    from app.models.user import User


AccountActionTokenPurpose = Literal["email_verification", "password_reset"]


class AccountActionToken(Base):
    """One-time, hashed token for a narrowly scoped account action."""

    __tablename__ = "account_action_tokens"
    __table_args__ = (
        CheckConstraint(
            "purpose IN ('email_verification', 'password_reset')",
            name="ck_account_action_tokens_purpose",
        ),
        CheckConstraint(
            "token_hash <> ''",
            name="ck_account_action_tokens_hash_not_empty",
        ),
        Index(
            "ix_account_action_tokens_user_purpose_created",
            "user_id",
            "purpose",
            "created_at",
        ),
        Index("ix_account_action_tokens_expires_at", "expires_at"),
    )

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    purpose: Mapped[str] = mapped_column(String(32), nullable=False)
    token_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
        index=True,
    )
    issued_auth_version: Mapped[int] = mapped_column(Integer, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    consumed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    user: Mapped[User] = relationship()
