from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base

if TYPE_CHECKING:
    from app.models.project import Project


class ProjectTaskStatus(Base):
    """One ordered task workflow state owned by a project."""

    __tablename__ = "project_task_statuses"
    __table_args__ = (
        CheckConstraint("key <> ''", name="ck_project_task_statuses_key_not_empty"),
        CheckConstraint("label <> ''", name="ck_project_task_statuses_label_not_empty"),
        CheckConstraint("position >= 0", name="ck_project_task_statuses_position"),
        UniqueConstraint(
            "project_id",
            "key",
            name="uq_project_task_statuses_project_key",
        ),
        UniqueConstraint(
            "project_id",
            "position",
            name="uq_project_task_statuses_project_position",
        ),
        Index(
            "uq_project_task_statuses_completed",
            "project_id",
            unique=True,
            postgresql_where=text("is_completed"),
        ),
    )

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    project_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    key: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    is_completed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )

    project: Mapped[Project] = relationship(back_populates="task_statuses")
