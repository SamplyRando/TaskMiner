from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.attachment import Attachment
from app.models.project import Project
from app.models.task import Task
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember


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
        commit: bool = True,
    ) -> Attachment:
        attachment = Attachment(
            filename=filename,
            stored_filename=stored_filename,
            content_type=content_type,
            file_size=file_size,
            task_id=task.id,
        )
        self.session.add(attachment)

        if commit:
            try:
                self.session.commit()
                self.session.refresh(attachment)
            except SQLAlchemyError:
                self.session.rollback()
                raise
        else:
            self.session.flush()

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

    def get_by_id_for_user(
        self,
        attachment_id: UUID,
        user: User,
    ) -> Attachment | None:
        statement = (
            select(Attachment)
            .join(Task, Attachment.task_id == Task.id)
            .join(Project, Task.project_id == Project.id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .join(
                WorkspaceMember,
                WorkspaceMember.workspace_id == Workspace.id,
            )
            .where(
                Attachment.id == attachment_id,
                WorkspaceMember.user_id == user.id,
                Attachment.deleted_at.is_(None),
                Task.deleted_at.is_(None),
                Project.deleted_at.is_(None),
                Workspace.deleted_at.is_(None),
            )
        )
        return self.session.scalar(statement)

    def lock_workspace(self, workspace_id: UUID) -> None:
        self.session.execute(
            select(Workspace.id)
            .where(
                Workspace.id == workspace_id,
                Workspace.deleted_at.is_(None),
            )
            .with_for_update()
        ).scalar_one()

    def workspace_storage_bytes(self, workspace_id: UUID) -> int:
        statement = (
            select(func.coalesce(func.sum(Attachment.file_size), 0))
            .join(Task, Attachment.task_id == Task.id)
            .join(Project, Task.project_id == Project.id)
            .where(
                Project.workspace_id == workspace_id,
                Attachment.deleted_at.is_(None),
            )
        )
        return int(self.session.scalar(statement) or 0)

    def deleted_stored_filenames(self, workspace_id: UUID) -> list[str]:
        statement = (
            select(Attachment.stored_filename)
            .join(Task, Attachment.task_id == Task.id)
            .join(Project, Task.project_id == Project.id)
            .where(
                Project.workspace_id == workspace_id,
                Attachment.deleted_at.is_not(None),
            )
        )
        return list(self.session.scalars(statement).all())

    def delete(self, attachment: Attachment, *, commit: bool = True) -> None:
        attachment.deleted_at = datetime.now(timezone.utc)
        if commit:
            try:
                self.session.commit()
                self.session.refresh(attachment)
            except SQLAlchemyError:
                self.session.rollback()
                raise
        else:
            self.session.flush()

    def commit(self) -> None:
        self.session.commit()

    def rollback(self) -> None:
        self.session.rollback()

    def refresh(self, attachment: Attachment) -> None:
        self.session.refresh(attachment)
