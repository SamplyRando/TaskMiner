from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_access_token
from app.database.database import get_db
from app.models.user import User
from app.repositories.activity import ActivityRepository
from app.repositories.audit import AuditRepository
from app.repositories.attachment import AttachmentRepository
from app.repositories.comment import CommentRepository
from app.repositories.dashboard import DashboardRepository
from app.repositories.project import ProjectRepository
from app.repositories.task import TaskRepository
from app.repositories.user import UserRepository
from app.repositories.workspace import WorkspaceRepository
from app.repositories.workspace_invitation import WorkspaceInvitationRepository
from app.repositories.workspace_member import WorkspaceMemberRepository
from app.services.attachment import AttachmentService
from app.services.activity import ActivityService
from app.services.audit import AuditService
from app.services.comment import CommentService
from app.services.dashboard import DashboardService
from app.services.permission import PermissionService
from app.services.project import ProjectService
from app.services.task import TaskService
from app.services.task_assignment import TaskAssignmentService
from app.services.user import UserService
from app.services.workspace import WorkspaceService
from app.services.workspace_invitation import WorkspaceInvitationService
from app.services.workspace_member import WorkspaceMemberService


SessionDep = Annotated[Session, Depends(get_db)]

bearer_scheme = HTTPBearer(auto_error=False)

BearerCredentials = Annotated[
    HTTPAuthorizationCredentials | None,
    Depends(bearer_scheme),
]


def get_current_user(
    credentials: BearerCredentials,
    session: SessionDep,
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise unauthorized

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = UUID(str(payload.get("sub")))
    except (JWTError, TypeError, ValueError) as exc:
        raise unauthorized from exc

    user = UserRepository(session).get(user_id)
    if user is None or not user.is_active:
        raise unauthorized

    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


def get_dashboard_service(session: SessionDep) -> DashboardService:
    return DashboardService(DashboardRepository(session))


DashboardServiceDep = Annotated[
    DashboardService,
    Depends(get_dashboard_service),
]


def get_user_service(session: SessionDep) -> UserService:
    return UserService(UserRepository(session))


UserServiceDep = Annotated[UserService, Depends(get_user_service)]


def get_project_service(session: SessionDep) -> ProjectService:
    return ProjectService(
        ProjectRepository(session),
        WorkspaceRepository(session),
    )


ProjectServiceDep = Annotated[ProjectService, Depends(get_project_service)]


def get_task_service(session: SessionDep) -> TaskService:
    return TaskService(
        TaskRepository(session),
        ProjectRepository(session),
    )


TaskServiceDep = Annotated[TaskService, Depends(get_task_service)]


def get_attachment_service(session: SessionDep) -> AttachmentService:
    return AttachmentService(
        AttachmentRepository(session),
        TaskRepository(session),
        settings.storage_path,
    )


AttachmentServiceDep = Annotated[AttachmentService, Depends(get_attachment_service)]


def get_comment_service(session: SessionDep) -> CommentService:
    return CommentService(
        CommentRepository(session),
        TaskRepository(session),
    )


CommentServiceDep = Annotated[CommentService, Depends(get_comment_service)]


def get_task_assignment_service(session: SessionDep) -> TaskAssignmentService:
    return TaskAssignmentService(
        TaskRepository(session),
        UserRepository(session),
    )


TaskAssignmentServiceDep = Annotated[
    TaskAssignmentService,
    Depends(get_task_assignment_service),
]


def get_workspace_service(session: SessionDep) -> WorkspaceService:
    return WorkspaceService(WorkspaceRepository(session))


WorkspaceServiceDep = Annotated[WorkspaceService, Depends(get_workspace_service)]


def get_workspace_member_service(session: SessionDep) -> WorkspaceMemberService:
    return WorkspaceMemberService(
        WorkspaceMemberRepository(session),
        WorkspaceRepository(session),
    )


WorkspaceMemberServiceDep = Annotated[
    WorkspaceMemberService,
    Depends(get_workspace_member_service),
]


def get_permission_service(session: SessionDep) -> PermissionService:
    return PermissionService(
        WorkspaceMemberRepository(session),
        WorkspaceRepository(session),
    )


PermissionServiceDep = Annotated[
    PermissionService,
    Depends(get_permission_service),
]


def get_workspace_invitation_service(
    session: SessionDep,
) -> WorkspaceInvitationService:
    member_repository = WorkspaceMemberRepository(session)
    permission_service = PermissionService(
        member_repository,
        WorkspaceRepository(session),
    )
    return WorkspaceInvitationService(
        WorkspaceInvitationRepository(session),
        member_repository,
        permission_service,
    )


WorkspaceInvitationServiceDep = Annotated[
    WorkspaceInvitationService,
    Depends(get_workspace_invitation_service),
]


def get_activity_service(session: SessionDep) -> ActivityService:
    member_repository = WorkspaceMemberRepository(session)
    permission_service = PermissionService(
        member_repository,
        WorkspaceRepository(session),
    )
    return ActivityService(
        ActivityRepository(session),
        permission_service,
    )


ActivityServiceDep = Annotated[
    ActivityService,
    Depends(get_activity_service),
]


def get_audit_service(session: SessionDep) -> AuditService:
    member_repository = WorkspaceMemberRepository(session)
    permission_service = PermissionService(
        member_repository,
        WorkspaceRepository(session),
    )
    return AuditService(
        AuditRepository(session),
        permission_service,
    )


AuditServiceDep = Annotated[
    AuditService,
    Depends(get_audit_service),
]
