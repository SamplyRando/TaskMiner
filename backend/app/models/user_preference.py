from __future__ import annotations

from enum import Enum
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, text
from sqlalchemy import Enum as SQLAlchemyEnum
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class UserTheme(str, Enum):
    LIGHT = "light"
    DARK = "dark"
    SYSTEM = "system"


class UserMotion(str, Enum):
    FULL = "full"
    REDUCED = "reduced"


class UserAccent(str, Enum):
    VIOLET = "violet"
    BLUE = "blue"
    GREEN = "green"
    ORANGE = "orange"


class UserPreference(TimestampMixin, Base):
    """Persistent presentation and notification choices for one user."""

    __tablename__ = "user_preferences"
    __table_args__ = (
        CheckConstraint(
            "items_per_page IN (10, 20, 50, 100)",
            name="ck_user_preferences_items_per_page",
        ),
        CheckConstraint(
            "dashboard_period IN (7, 30, 90)",
            name="ck_user_preferences_dashboard_period",
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
        unique=True,
    )
    theme: Mapped[UserTheme] = mapped_column(
        SQLAlchemyEnum(
            UserTheme,
            name="user_theme",
            values_callable=lambda enum_class: [member.value for member in enum_class],
        ),
        nullable=False,
        default=UserTheme.SYSTEM,
        server_default=text("'system'"),
    )
    motion: Mapped[UserMotion] = mapped_column(
        SQLAlchemyEnum(
            UserMotion,
            name="user_motion",
            values_callable=lambda enum_class: [member.value for member in enum_class],
        ),
        nullable=False,
        default=UserMotion.FULL,
        server_default=text("'full'"),
    )
    items_per_page: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=20,
        server_default=text("20"),
    )
    dashboard_period: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=30,
        server_default=text("30"),
    )
    accent: Mapped[UserAccent] = mapped_column(
        SQLAlchemyEnum(
            UserAccent,
            name="user_accent",
            values_callable=lambda enum_class: [member.value for member in enum_class],
        ),
        nullable=False,
        default=UserAccent.VIOLET,
        server_default=text("'violet'"),
    )
    notify_activity_feed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    notify_audit: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    notify_invitations: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    notify_comments: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    notify_assignments: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )

    user: Mapped[User] = relationship(back_populates="preferences")
