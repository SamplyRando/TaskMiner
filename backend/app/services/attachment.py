from dataclasses import dataclass
import logging
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import UploadFile

from app.core.events import (
    ActivityEventType,
    ActivityResourceType,
    DomainEvent,
    publish,
)
from app.models.attachment import Attachment
from app.models.task import Task
from app.models.user import User
from app.repositories.attachment import AttachmentRepository
from app.repositories.task import TaskRepository
from app.services.permission import PermissionService
from app.services.request_rate_limit import RateLimitScope, RequestRateLimitService


ALLOWED_EXTENSIONS = frozenset({"pdf", "png", "jpg", "jpeg", "txt", "csv", "zip"})
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
UPLOAD_CHUNK_SIZE = 1024 * 1024
logger = logging.getLogger(__name__)


class AttachmentTaskNotFoundError(Exception):
    """Raised when an attachment's parent task is inaccessible."""


class AttachmentNotFoundError(Exception):
    """Raised when an attachment is inaccessible to the requested owner."""


class AttachmentExtensionNotAllowedError(Exception):
    """Raised when an uploaded file extension is not allowed."""


class AttachmentTooLargeError(Exception):
    """Raised when an uploaded file exceeds the configured size limit."""


class AttachmentWorkspaceQuotaExceededError(Exception):
    """Raised before a staged upload exceeds its workspace storage budget."""


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
        permission_service: PermissionService,
        storage_path: Path,
        rate_limiter: RequestRateLimitService,
        *,
        workspace_quota_bytes: int,
        upload_rate_limit_requests: int,
        upload_rate_limit_window_seconds: int,
    ) -> None:
        self.repository = repository
        self.task_repository = task_repository
        self.permission_service = permission_service
        self.storage_path = storage_path
        self.rate_limiter = rate_limiter
        self.workspace_quota_bytes = workspace_quota_bytes
        self.upload_rate_limit_requests = upload_rate_limit_requests
        self.upload_rate_limit_window_seconds = upload_rate_limit_window_seconds

    def upload_attachment(
        self,
        owner: User,
        task_id: UUID,
        upload: UploadFile,
    ) -> Attachment:
        task = self._get_accessible_task(owner, task_id)
        self.permission_service.require_task_management(
            owner,
            task.project.workspace_id,
        )
        self.rate_limiter.enforce(
            action="attachment_upload",
            scopes=(
                RateLimitScope("workspace", str(task.project.workspace_id)),
                RateLimitScope("user", str(owner.id)),
            ),
            limit=self.upload_rate_limit_requests,
            window_seconds=self.upload_rate_limit_window_seconds,
        )
        filename, extension = self._validate_filename(upload.filename)
        stored_filename = f"{uuid4()}.{extension}"
        destination = self.storage_path / stored_filename
        staged_path = self.storage_path / f".upload-{uuid4().hex}"
        file_size = self._store_file(upload, staged_path)

        try:
            self.repository.lock_workspace(task.project.workspace_id)
            self._cleanup_deleted_workspace_files(task.project.workspace_id)
            used_bytes = self.repository.workspace_storage_bytes(
                task.project.workspace_id
            )
            if used_bytes + file_size > self.workspace_quota_bytes:
                raise AttachmentWorkspaceQuotaExceededError
            staged_path.replace(destination)
            attachment = self.repository.create(
                task,
                filename=filename,
                stored_filename=stored_filename,
                content_type=upload.content_type or "application/octet-stream",
                file_size=file_size,
                commit=False,
            )
            self.repository.commit()
            self.repository.refresh(attachment)
        except Exception:
            self.repository.rollback()
            staged_path.unlink(missing_ok=True)
            destination.unlink(missing_ok=True)
            raise
        publish(
            DomainEvent(
                event_type=ActivityEventType.ATTACHMENT_UPLOADED,
                resource_type=ActivityResourceType.ATTACHMENT,
                workspace_id=task.project.workspace_id,
                resource_id=attachment.id,
                actor_id=owner.id,
                new_values={
                    "content_type": attachment.content_type,
                    "file_size": attachment.file_size,
                    "filename": attachment.filename,
                    "task_id": str(task.id),
                },
                metadata={
                    "filename": attachment.filename,
                    "file_size": attachment.file_size,
                    "task_id": str(task.id),
                },
            )
        )
        return attachment

    def list_attachments(self, owner: User, task_id: UUID) -> list[Attachment]:
        task = self._get_accessible_task(owner, task_id)
        return self.repository.list_by_task(task)

    def get_download(
        self,
        owner: User,
        attachment_id: UUID,
    ) -> AttachmentDownload:
        attachment = self.repository.get_by_id_for_user(attachment_id, owner)
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
        attachment = self.repository.get_by_id_for_user(attachment_id, owner)
        if attachment is None:
            raise AttachmentNotFoundError
        self.permission_service.require_task_management(
            owner,
            attachment.task.project.workspace_id,
        )
        path = self._stored_path(attachment.stored_filename)
        try:
            self.repository.delete(attachment, commit=False)
            self.repository.commit()
        except Exception:
            self.repository.rollback()
            raise
        try:
            quarantine = self.storage_path / f".deleted-{uuid4().hex}"
            if path.is_file():
                path.replace(quarantine)
            quarantine.unlink(missing_ok=True)
        except OSError:
            logger.exception("attachment_file_cleanup_failed")

    def _get_accessible_task(self, owner: User, task_id: UUID) -> Task:
        task = self.task_repository.get_by_id_for_user(task_id, owner)
        if task is None:
            raise AttachmentTaskNotFoundError
        return task

    def _store_file(self, upload: UploadFile, destination: Path) -> int:
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self._cleanup_delete_tombstones()
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

    def _stored_path(self, stored_filename: str) -> Path:
        storage_root = self.storage_path.resolve()
        path = (storage_root / stored_filename).resolve()
        if path.parent != storage_root:
            raise AttachmentNotFoundError
        return path

    def _cleanup_delete_tombstones(self) -> None:
        for path in self.storage_path.glob(".deleted-*"):
            try:
                path.unlink(missing_ok=True)
            except OSError:
                logger.exception("attachment_tombstone_cleanup_failed")

    def _cleanup_deleted_workspace_files(self, workspace_id: UUID) -> None:
        for stored_filename in self.repository.deleted_stored_filenames(workspace_id):
            try:
                self._stored_path(stored_filename).unlink(missing_ok=True)
            except (AttachmentNotFoundError, OSError):
                logger.exception("attachment_soft_delete_cleanup_failed")

    @staticmethod
    def _validate_filename(raw_filename: str | None) -> tuple[str, str]:
        filename = Path((raw_filename or "").replace("\\", "/")).name
        extension = Path(filename).suffix.lower().removeprefix(".")
        if not filename or extension not in ALLOWED_EXTENSIONS:
            raise AttachmentExtensionNotAllowedError
        return filename, extension
