"""SQLAlchemy model declarations exposed for Alembic discovery."""

from app.models.activity import Activity
from app.models.ai_plan_application import AIPlanApplication
from app.models.ai_usage_event import AIUsageEvent
from app.models.audit_log import AuditLog
from app.models.attachment import Attachment
from app.models.comment import Comment
from app.models.project import Project
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user import User
from app.models.user_preference import UserAccent, UserMotion, UserPreference, UserTheme
from app.models.workspace import Workspace
from app.models.workspace_invitation import (
    InvitationEmailDeliveryStatus,
    InvitationStatus,
    WorkspaceInvitation,
)
from app.models.workspace_member import WorkspaceMember, WorkspaceMemberRole

__all__ = [
    "Activity",
    "AIPlanApplication",
    "AIUsageEvent",
    "AuditLog",
    "Attachment",
    "Comment",
    "Project",
    "Task",
    "TaskPriority",
    "TaskStatus",
    "User",
    "UserAccent",
    "UserMotion",
    "UserPreference",
    "UserTheme",
    "Workspace",
    "WorkspaceInvitation",
    "InvitationStatus",
    "InvitationEmailDeliveryStatus",
    "WorkspaceMember",
    "WorkspaceMemberRole",
]
