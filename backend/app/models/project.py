from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.project_task_status import ProjectTaskStatus
    from app.models.task import Task
    from app.models.workspace import Workspace


class Project(SoftDeleteMixin, TimestampMixin, Base):
    """Collection of tasks belonging to exactly one workspace."""

    __tablename__ = "projects"
    __table_args__ = (CheckConstraint("name <> ''", name="ck_projects_name_not_empty"),)

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    workspace_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    workspace: Mapped[Workspace] = relationship(
        back_populates="projects",
        lazy="joined",
    )
    tasks: Mapped[list[Task]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    task_statuses: Mapped[list[ProjectTaskStatus]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ProjectTaskStatus.position",
    )

    @property
    def owner_id(self) -> UUID:
        """Expose the workspace owner for backwards-compatible API responses."""
        return self.workspace.owner_id
