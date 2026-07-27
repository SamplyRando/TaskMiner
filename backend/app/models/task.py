from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, text
from sqlalchemy import Enum as SQLAlchemyEnum
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.attachment import Attachment
    from app.models.project import Project


class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


def enum_values(enum_class: type[Enum]) -> list[str]:
    return [str(member.value) for member in enum_class]


class Task(SoftDeleteMixin, TimestampMixin, Base):
    """Work item belonging to exactly one project."""

    __tablename__ = "tasks"
    __table_args__ = (CheckConstraint("title <> ''", name="ck_tasks_title_not_empty"),)

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(
        SQLAlchemyEnum(
            TaskStatus,
            name="task_status",
            values_callable=enum_values,
        ),
        nullable=False,
        default=TaskStatus.TODO,
        server_default=text("'todo'"),
        index=True,
    )
    priority: Mapped[TaskPriority] = mapped_column(
        SQLAlchemyEnum(
            TaskPriority,
            name="task_priority",
            values_callable=enum_values,
        ),
        nullable=False,
        default=TaskPriority.MEDIUM,
        server_default=text("'medium'"),
        index=True,
    )
    due_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    project_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    project: Mapped[Project] = relationship(back_populates="tasks")
    attachments: Mapped[list[Attachment]] = relationship(
        back_populates="task",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
