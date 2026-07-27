"""Application service declarations."""

from app.services.attachment import (
    AttachmentExtensionNotAllowedError,
    AttachmentNotFoundError,
    AttachmentService,
    AttachmentTaskNotFoundError,
    AttachmentTooLargeError,
)
from app.services.project import ProjectNotFoundError, ProjectService
from app.services.task import TaskNotFoundError, TaskProjectNotFoundError, TaskService
from app.services.user import (
    InvalidCredentialsError,
    UserAlreadyExistsError,
    UserService,
)

__all__ = [
    "AttachmentExtensionNotAllowedError",
    "AttachmentNotFoundError",
    "AttachmentService",
    "AttachmentTaskNotFoundError",
    "AttachmentTooLargeError",
    "InvalidCredentialsError",
    "ProjectNotFoundError",
    "ProjectService",
    "TaskNotFoundError",
    "TaskProjectNotFoundError",
    "TaskService",
    "UserAlreadyExistsError",
    "UserService",
]
