from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    String,
    Text,
    exists,
    text,
)
from sqlalchemy import Enum as SQLAlchemyEnum
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.attachment import Attachment
    from app.models.comment import Comment
    from app.models.project import Project
    from app.models.project_task_status import ProjectTaskStatus
    from app.models.user import User


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
    __table_args__ = (
        CheckConstraint("title <> ''", name="ck_tasks_title_not_empty"),
        ForeignKeyConstraint(
            ["project_id", "status"],
            ["project_task_statuses.project_id", "project_task_statuses.key"],
            name="fk_tasks_project_status",
            ondelete="RESTRICT",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default=TaskStatus.TODO.value,
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
    assigned_user_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    project: Mapped[Project] = relationship(back_populates="tasks")
    status_definition: Mapped[ProjectTaskStatus] = relationship(
        viewonly=True,
        lazy="selectin",
    )
    assigned_user: Mapped[User | None] = relationship(
        back_populates="assigned_tasks",
        foreign_keys=[assigned_user_id],
    )
    attachments: Mapped[list[Attachment]] = relationship(
        back_populates="task",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    comments: Mapped[list[Comment]] = relationship(
        back_populates="task",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    @property
    def status_label(self) -> str:
        return self.status_definition.label

    @hybrid_property
    def status_is_completed(self) -> bool:
        return self.status_definition.is_completed

    @status_is_completed.inplace.expression
    @classmethod
    def _status_is_completed_expression(cls):
        from app.models.project_task_status import ProjectTaskStatus

        return (
            exists()
            .where(
                ProjectTaskStatus.project_id == cls.project_id,
                ProjectTaskStatus.key == cls.status,
                ProjectTaskStatus.is_completed.is_(True),
            )
            .correlate(cls)
        )
