from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, String, text
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.task import Task


class Attachment(SoftDeleteMixin, TimestampMixin, Base):
    """File metadata belonging to exactly one task."""

    __tablename__ = "attachments"
    __table_args__ = (
        CheckConstraint("filename <> ''", name="ck_attachments_filename_not_empty"),
        CheckConstraint(
            "stored_filename <> ''",
            name="ck_attachments_stored_filename_not_empty",
        ),
        CheckConstraint(
            "file_size >= 0",
            name="ck_attachments_file_size_non_negative",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True,
    )
    content_type: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    task_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    task: Mapped[Task] = relationship(back_populates="attachments")
