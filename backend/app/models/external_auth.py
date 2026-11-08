from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Literal
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base

if TYPE_CHECKING:
    from app.models.user import User


ExternalAuthProvider = Literal["google"]
ExternalAuthAttemptPurpose = Literal["authenticate", "link"]


class ExternalAuthIdentity(Base):
    """Stable external subject linked to exactly one TaskMiner account."""

    __tablename__ = "external_auth_identities"
    __table_args__ = (
        CheckConstraint(
            "provider IN ('google')",
            name="ck_external_auth_identities_provider",
        ),
        UniqueConstraint(
            "provider",
            "provider_subject",
            name="uq_external_auth_identities_provider_subject",
        ),
        UniqueConstraint(
            "user_id",
            "provider",
            name="uq_external_auth_identities_user_provider",
        ),
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
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    provider_subject: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    user: Mapped[User] = relationship()


class ExternalAuthAttempt(Base):
    """One-time, hashed nonce used to bind a Google response to its browser."""

    __tablename__ = "external_auth_attempts"
    __table_args__ = (
        CheckConstraint(
            "provider IN ('google')",
            name="ck_external_auth_attempts_provider",
        ),
        CheckConstraint(
            "purpose IN ('authenticate', 'link')",
            name="ck_external_auth_attempts_purpose",
        ),
        CheckConstraint(
            "nonce_hash <> ''",
            name="ck_external_auth_attempts_nonce_hash_not_empty",
        ),
        Index(
            "ix_external_auth_attempts_expires_consumed",
            "expires_at",
            "consumed_at",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    purpose: Mapped[str] = mapped_column(String(32), nullable=False)
    nonce_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
        index=True,
    )
    user_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
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

    user: Mapped[User | None] = relationship()
