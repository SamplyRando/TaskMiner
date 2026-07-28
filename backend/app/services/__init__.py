"""Application service declarations."""

from app.services.attachment import (
    AttachmentExtensionNotAllowedError,
    AttachmentNotFoundError,
    AttachmentService,
    AttachmentTaskNotFoundError,
    AttachmentTooLargeError,
)
from app.services.comment import (
    CommentNotFoundError,
    CommentService,
    CommentTaskNotFoundError,
)
from app.services.project import ProjectNotFoundError, ProjectService
from app.services.task import TaskNotFoundError, TaskProjectNotFoundError, TaskService
from app.services.task_assignment import (
    TaskAssigneeNotFoundError,
    TaskAssignmentService,
)
from app.services.user import (
    InvalidCredentialsError,
    UserAlreadyExistsError,
    UserService,
)
from app.services.workspace import WorkspaceNotFoundError, WorkspaceService

__all__ = [
    "AttachmentExtensionNotAllowedError",
    "AttachmentNotFoundError",
    "AttachmentService",
    "AttachmentTaskNotFoundError",
    "AttachmentTooLargeError",
    "CommentNotFoundError",
    "CommentService",
    "CommentTaskNotFoundError",
    "InvalidCredentialsError",
    "ProjectNotFoundError",
    "ProjectService",
    "TaskNotFoundError",
    "TaskProjectNotFoundError",
    "TaskService",
    "TaskAssigneeNotFoundError",
    "TaskAssignmentService",
    "UserAlreadyExistsError",
    "UserService",
    "WorkspaceNotFoundError",
    "WorkspaceService",
]
