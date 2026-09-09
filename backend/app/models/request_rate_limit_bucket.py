from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy import func, text
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.database import Base


class RequestRateLimitBucket(Base):
    """A shared PostgreSQL fixed-window counter for sensitive requests."""

    __tablename__ = "request_rate_limit_buckets"
    __table_args__ = (
        CheckConstraint(
            "request_count > 0",
            name="ck_request_rate_limit_buckets_count_positive",
        ),
        UniqueConstraint(
            "action",
            "scope_type",
            "scope_hash",
            "window_start",
            name="uq_request_rate_limit_bucket_scope_window",
        ),
        Index("ix_request_rate_limit_buckets_window_start", "window_start"),
    )

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    scope_type: Mapped[str] = mapped_column(String(32), nullable=False)
    scope_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    window_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    request_count: Mapped[int] = mapped_column(Integer, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
