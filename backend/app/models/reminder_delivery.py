from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.database import Base


class ReminderDelivery(Base):
    """Durable logical delivery claim for one due-date reminder."""

    __tablename__ = "reminder_deliveries"
    __table_args__ = (
        CheckConstraint(
            "entity_type IN ('task', 'project')",
            name="ck_reminder_deliveries_entity_type",
        ),
        CheckConstraint(
            "lead_days IN (1, 2, 3, 7)",
            name="ck_reminder_deliveries_lead_days",
        ),
        CheckConstraint(
            "email_status IN ('pending', 'sending', 'sent', 'failed')",
            name="ck_reminder_deliveries_email_status",
        ),
        UniqueConstraint(
            "recipient_user_id",
            "entity_type",
            "entity_id",
            "due_at",
            "lead_days",
            name="uq_reminder_deliveries_logical_delivery",
        ),
        Index(
            "ix_reminder_deliveries_recipient_created",
            "recipient_user_id",
            "created_at",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    workspace_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    recipient_user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    entity_type: Mapped[str] = mapped_column(String(32), nullable=False)
    entity_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), nullable=False
    )
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    lead_days: Mapped[int] = mapped_column(Integer, nullable=False)
    email_status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="pending", server_default=text("'pending'")
    )
    email_attempted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    email_sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
