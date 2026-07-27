from dataclasses import dataclass
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import UploadFile

from app.models.attachment import Attachment
from app.models.task import Task
from app.models.user import User
from app.repositories.attachment import AttachmentRepository
from app.repositories.task import TaskRepository


ALLOWED_EXTENSIONS = frozenset({"pdf", "png", "jpg", "jpeg", "txt", "csv", "zip"})
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
UPLOAD_CHUNK_SIZE = 1024 * 1024


class AttachmentTaskNotFoundError(Exception):
    """Raised when an attachment's parent task is inaccessible."""


class AttachmentNotFoundError(Exception):
    """Raised when an attachment is inaccessible to the requested owner."""


class AttachmentExtensionNotAllowedError(Exception):
    """Raised when an uploaded file extension is not allowed."""


class AttachmentTooLargeError(Exception):
    """Raised when an uploaded file exceeds the configured size limit."""


@dataclass(frozen=True)
class AttachmentDownload:
    path: Path
    filename: str
    content_type: str


class AttachmentService:
    """Application service for attachment-related use cases."""

    def __init__(
        self,
        repository: AttachmentRepository,
        task_repository: TaskRepository,
        storage_path: Path,
    ) -> None:
        self.repository = repository
        self.task_repository = task_repository
        self.storage_path = storage_path

    def upload_attachment(
        self,
        owner: User,
        task_id: UUID,
        upload: UploadFile,
    ) -> Attachment:
        task = self._get_owned_task(owner, task_id)
        filename, extension = self._validate_filename(upload.filename)
        stored_filename = f"{uuid4()}.{extension}"
        destination = self.storage_path / stored_filename
        file_size = self._store_file(upload, destination)

        try:
            return self.repository.create(
                task,
                filename=filename,
                stored_filename=stored_filename,
                content_type=upload.content_type or "application/octet-stream",
                file_size=file_size,
            )
        except Exception:
            destination.unlink(missing_ok=True)
            raise

    def list_attachments(self, owner: User, task_id: UUID) -> list[Attachment]:
        task = self._get_owned_task(owner, task_id)
        return self.repository.list_by_task(task)

    def get_download(
        self,
        owner: User,
        attachment_id: UUID,
    ) -> AttachmentDownload:
        attachment = self.repository.get_by_id_for_owner(attachment_id, owner)
        if attachment is None:
            raise AttachmentNotFoundError

        storage_root = self.storage_path.resolve()
        path = (storage_root / attachment.stored_filename).resolve()
        if path.parent != storage_root or not path.is_file():
            raise AttachmentNotFoundError

        return AttachmentDownload(
            path=path,
            filename=attachment.filename,
            content_type=attachment.content_type,
        )

    def delete_attachment(self, owner: User, attachment_id: UUID) -> None:
        attachment = self.repository.get_by_id_for_owner(attachment_id, owner)
        if attachment is None:
            raise AttachmentNotFoundError
        self.repository.delete(attachment)

    def _get_owned_task(self, owner: User, task_id: UUID) -> Task:
        task = self.task_repository.get_by_id_for_owner(task_id, owner)
        if task is None:
            raise AttachmentTaskNotFoundError
        return task

    def _store_file(self, upload: UploadFile, destination: Path) -> int:
        self.storage_path.mkdir(parents=True, exist_ok=True)
        file_size = 0
        try:
            upload.file.seek(0)
            with destination.open("xb") as stored_file:
                while chunk := upload.file.read(UPLOAD_CHUNK_SIZE):
                    file_size += len(chunk)
                    if file_size > MAX_FILE_SIZE_BYTES:
                        raise AttachmentTooLargeError
                    stored_file.write(chunk)
        except Exception:
            destination.unlink(missing_ok=True)
            raise
        return file_size

    @staticmethod
    def _validate_filename(raw_filename: str | None) -> tuple[str, str]:
        filename = Path((raw_filename or "").replace("\\", "/")).name
        extension = Path(filename).suffix.lower().removeprefix(".")
        if not filename or extension not in ALLOWED_EXTENSIONS:
            raise AttachmentExtensionNotAllowedError
        return filename, extension
