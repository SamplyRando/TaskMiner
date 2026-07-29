"""Pydantic request and response schemas."""

from app.schemas.attachment import AttachmentRead
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.comment import CommentCreate, CommentRead, CommentUpdate
from app.schemas.pagination import PaginatedResponse
from app.schemas.permissions import WorkspacePermissionFlags, WorkspacePermissionsRead
from app.schemas.project import (
    ProjectCreate,
    ProjectListParams,
    ProjectRead,
    ProjectUpdate,
)
from app.schemas.task import TaskCreate, TaskListParams, TaskRead, TaskUpdate
from app.schemas.task_assignment import TaskAssignmentUpdate
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.schemas.workspace import WorkspaceCreate, WorkspaceRead, WorkspaceUpdate
from app.schemas.workspace_invitation import (
    InvitationAccept,
    InvitationCreate,
    InvitationList,
    InvitationRead,
    InvitationStatus,
)
from app.schemas.workspace_member import (
    WorkspaceMemberList,
    WorkspaceMemberRead,
    WorkspaceMemberRoleUpdate,
)

__all__ = [
    "AttachmentRead",
    "CommentCreate",
    "CommentRead",
    "CommentUpdate",
    "LoginRequest",
    "PaginatedResponse",
    "ProjectCreate",
    "ProjectListParams",
    "ProjectRead",
    "ProjectUpdate",
    "TaskCreate",
    "TaskListParams",
    "TaskRead",
    "TaskUpdate",
    "TaskAssignmentUpdate",
    "TokenResponse",
    "UserCreate",
    "UserRead",
    "UserUpdate",
    "WorkspaceCreate",
    "WorkspaceRead",
    "WorkspaceUpdate",
    "InvitationAccept",
    "InvitationCreate",
    "InvitationList",
    "InvitationRead",
    "InvitationStatus",
    "WorkspaceMemberList",
    "WorkspaceMemberRead",
    "WorkspaceMemberRoleUpdate",
    "WorkspacePermissionFlags",
    "WorkspacePermissionsRead",
]
