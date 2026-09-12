from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.database import Base


class BillingCheckoutConsent(Base):
    """Append-only evidence of an explicit request tied to one Checkout attempt."""

    __tablename__ = "billing_checkout_consents"
    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "checkout_attempt_id",
            "consent_type",
            name="uq_billing_checkout_consents_attempt_type",
        ),
        Index(
            "ix_billing_checkout_consents_workspace_accepted",
            "workspace_id",
            "accepted_at",
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
    )
    user_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    checkout_attempt_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        nullable=False,
    )
    consent_type: Mapped[str] = mapped_column(String(64), nullable=False)
    text_version: Mapped[str] = mapped_column(String(32), nullable=False)
    accepted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
