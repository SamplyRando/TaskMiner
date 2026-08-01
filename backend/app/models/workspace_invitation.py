from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, text
from sqlalchemy import Enum as SQLAlchemyEnum
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base
from app.models.mixins import TimestampMixin
from app.models.workspace_member import WorkspaceMemberRole

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.workspace import Workspace


class InvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    REVOKED = "revoked"


class WorkspaceInvitation(TimestampMixin, Base):
    """Invitation to join a workspace with a predefined role."""

    __tablename__ = "workspace_invitations"
    __table_args__ = (
        CheckConstraint(
            "email <> ''",
            name="ck_workspace_invitations_email_not_empty",
        ),
        CheckConstraint(
            "token <> ''",
            name="ck_workspace_invitations_token_not_empty",
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
    invited_by_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    role: Mapped[WorkspaceMemberRole] = mapped_column(
        SQLAlchemyEnum(
            WorkspaceMemberRole,
            name="workspace_member_role",
            values_callable=lambda enum_class: [member.value for member in enum_class],
        ),
        nullable=False,
    )
    token: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True,
        index=True,
    )
    status: Mapped[InvitationStatus] = mapped_column(
        SQLAlchemyEnum(
            InvitationStatus,
            name="workspace_invitation_status",
            values_callable=lambda enum_class: [member.value for member in enum_class],
        ),
        nullable=False,
        default=InvitationStatus.PENDING,
        server_default=text("'pending'"),
        index=True,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    accepted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    workspace: Mapped[Workspace] = relationship(back_populates="invitations")
    invited_by: Mapped[User | None] = relationship(
        back_populates="sent_workspace_invitations",
        foreign_keys=[invited_by_id],
        lazy="joined",
    )
