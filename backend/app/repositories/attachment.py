from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.attachment import Attachment
from app.models.project import Project
from app.models.task import Task
from app.models.user import User
from app.models.workspace import Workspace


class AttachmentRepository:
    """Persistence operations for owner-scoped attachments."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def create(
        self,
        task: Task,
        *,
        filename: str,
        stored_filename: str,
        content_type: str,
        file_size: int,
    ) -> Attachment:
        attachment = Attachment(
            filename=filename,
            stored_filename=stored_filename,
            content_type=content_type,
            file_size=file_size,
            task_id=task.id,
        )
        self.session.add(attachment)

        try:
            self.session.commit()
            self.session.refresh(attachment)
        except SQLAlchemyError:
            self.session.rollback()
            raise

        return attachment

    def list_by_task(self, task: Task) -> list[Attachment]:
        statement = (
            select(Attachment)
            .where(
                Attachment.task_id == task.id,
                Attachment.deleted_at.is_(None),
            )
            .order_by(Attachment.created_at.desc(), Attachment.id.asc())
        )
        return list(self.session.scalars(statement).all())

    def get_by_id_for_owner(
        self,
        attachment_id: UUID,
        owner: User,
    ) -> Attachment | None:
        statement = (
            select(Attachment)
            .join(Task, Attachment.task_id == Task.id)
            .join(Project, Task.project_id == Project.id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(
                Attachment.id == attachment_id,
                Workspace.owner_id == owner.id,
                Attachment.deleted_at.is_(None),
                Task.deleted_at.is_(None),
                Project.deleted_at.is_(None),
                Workspace.deleted_at.is_(None),
            )
        )
        return self.session.scalar(statement)

    def delete(self, attachment: Attachment) -> None:
        attachment.deleted_at = datetime.now(timezone.utc)
        try:
            self.session.commit()
            self.session.refresh(attachment)
        except SQLAlchemyError:
            self.session.rollback()
            raise
