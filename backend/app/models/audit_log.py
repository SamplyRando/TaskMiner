from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, func, text
from sqlalchemy import Enum as SQLAlchemyEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.events import ActivityEventType, ActivityResourceType
from app.database.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.workspace import Workspace


class AuditLog(Base):
    """Immutable audit record generated from a domain event."""

    __tablename__ = "audit_logs"

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
    actor_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    event_type: Mapped[ActivityEventType] = mapped_column(
        SQLAlchemyEnum(
            ActivityEventType,
            name="activity_event_type",
            values_callable=lambda enum_class: [member.value for member in enum_class],
        ),
        nullable=False,
        index=True,
    )
    resource_type: Mapped[ActivityResourceType] = mapped_column(
        SQLAlchemyEnum(
            ActivityResourceType,
            name="activity_resource_type",
            values_callable=lambda enum_class: [member.value for member in enum_class],
        ),
        nullable=False,
        index=True,
    )
    resource_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        nullable=False,
    )
    old_values: Mapped[dict[str, object] | None] = mapped_column(
        JSONB,
        nullable=True,
    )
    new_values: Mapped[dict[str, object] | None] = mapped_column(
        JSONB,
        nullable=True,
    )
    audit_metadata: Mapped[dict[str, object]] = mapped_column(
        "metadata",
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
    success: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )

    actor: Mapped[User | None] = relationship(
        foreign_keys=[actor_id],
        lazy="joined",
    )
    workspace: Mapped[Workspace] = relationship(
        foreign_keys=[workspace_id],
        lazy="joined",
    )
