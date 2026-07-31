"""Persistence contracts for TaskMiner entities."""

from app.repositories.activity import ActivityRepository
from app.repositories.audit import AuditRepository
from app.repositories.attachment import AttachmentRepository
from app.repositories.comment import CommentRepository
from app.repositories.dashboard import DashboardRepository
from app.repositories.project import ProjectRepository
from app.repositories.task import TaskRepository
from app.repositories.user import UserEmailConflictError, UserRepository
from app.repositories.workspace import WorkspaceRepository
from app.repositories.workspace_invitation import WorkspaceInvitationRepository
from app.repositories.workspace_member import WorkspaceMemberRepository

__all__ = [
    "ActivityRepository",
    "AuditRepository",
    "AttachmentRepository",
    "CommentRepository",
    "DashboardRepository",
    "ProjectRepository",
    "TaskRepository",
    "UserEmailConflictError",
    "UserRepository",
    "WorkspaceRepository",
    "WorkspaceInvitationRepository",
    "WorkspaceMemberRepository",
]
