from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, ForeignKey, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.task import Task
    from app.models.user import User


class CommentMention(Base):
    """Authoritative link between a comment and a mentioned workspace user."""

    __tablename__ = "comment_mentions"
    __table_args__ = (
        UniqueConstraint(
            "comment_id",
            "user_id",
            name="uq_comment_mentions_comment_user",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    comment_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("comments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    comment: Mapped[Comment] = relationship(back_populates="mention_links")
    user: Mapped[User] = relationship()


class Comment(SoftDeleteMixin, TimestampMixin, Base):
    """Comment authored by a user on exactly one task."""

    __tablename__ = "comments"
    __table_args__ = (
        CheckConstraint(
            "char_length(content) BETWEEN 1 AND 2000",
            name="ck_comments_content_length",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    task_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)

    task: Mapped[Task] = relationship(back_populates="comments")
    author: Mapped[User] = relationship(back_populates="comments")
    mention_links: Mapped[list[CommentMention]] = relationship(
        back_populates="comment",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="CommentMention.id",
    )

    @property
    def author_name(self) -> str:
        """Expose the author's display name without leaking account details."""

        return self.author.full_name

    @property
    def mentions(self) -> list[dict[str, object]]:
        """Expose mention display names without exposing account email addresses."""

        return [
            {"user_id": link.user_id, "display_name": link.user.full_name}
            for link in self.mention_links
        ]
