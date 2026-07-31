"""Application service declarations."""

from app.services.activity import ActivityService
from app.services.audit import AuditService
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
from app.services.dashboard import DashboardService
from app.services.project import ProjectNotFoundError, ProjectService
from app.services.permission import (
    LastOwnerError,
    OwnerAlreadyExistsError,
    PermissionDeniedError,
    PermissionService,
    SelfRoleChangeError,
)
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
from app.services.workspace_invitation import (
    InvitationAlreadyAcceptedError,
    InvitationEmailMismatchError,
    InvitationExpiredError,
    InvitationMemberAlreadyExistsError,
    InvitationNotFoundError,
    InvitationOwnerRoleError,
    InvitationRevokedError,
    InvitationTokenGenerationError,
    WorkspaceInvitationService,
)
from app.services.workspace_member import (
    WorkspaceMemberNotFoundError,
    WorkspaceMemberService,
)

__all__ = [
    "ActivityService",
    "AuditService",
    "AttachmentExtensionNotAllowedError",
    "AttachmentNotFoundError",
    "AttachmentService",
    "AttachmentTaskNotFoundError",
    "AttachmentTooLargeError",
    "CommentNotFoundError",
    "CommentService",
    "CommentTaskNotFoundError",
    "DashboardService",
    "InvalidCredentialsError",
    "ProjectNotFoundError",
    "ProjectService",
    "LastOwnerError",
    "OwnerAlreadyExistsError",
    "PermissionDeniedError",
    "PermissionService",
    "SelfRoleChangeError",
    "TaskNotFoundError",
    "TaskProjectNotFoundError",
    "TaskService",
    "TaskAssigneeNotFoundError",
    "TaskAssignmentService",
    "UserAlreadyExistsError",
    "UserService",
    "WorkspaceNotFoundError",
    "WorkspaceService",
    "InvitationAlreadyAcceptedError",
    "InvitationEmailMismatchError",
    "InvitationExpiredError",
    "InvitationMemberAlreadyExistsError",
    "InvitationNotFoundError",
    "InvitationOwnerRoleError",
    "InvitationRevokedError",
    "InvitationTokenGenerationError",
    "WorkspaceInvitationService",
    "WorkspaceMemberNotFoundError",
    "WorkspaceMemberService",
]
