from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.ai.apply_service import AIApplyService
from app.ai.change_apply_service import AIProjectChangeApplyService
from app.ai.change_service import AIProjectChangePlanService
from app.ai.factory import get_ai_provider
from app.ai.provider import AIProvider, AIProviderConfigurationError
from app.ai.service import AIService
from app.core.config import settings
from app.core.security import decode_access_token
from app.database.database import get_db
from app.models.user import User
from app.repositories.activity import ActivityRepository
from app.repositories.ai_plan_application import AIPlanApplicationRepository
from app.repositories.audit import AuditRepository
from app.repositories.attachment import AttachmentRepository
from app.repositories.comment import CommentRepository
from app.repositories.dashboard import DashboardRepository
from app.repositories.project import ProjectRepository
from app.repositories.task import TaskRepository
from app.repositories.user import UserRepository
from app.repositories.user_preference import UserPreferenceRepository
from app.repositories.workspace import WorkspaceRepository
from app.repositories.workspace_invitation import WorkspaceInvitationRepository
from app.repositories.workspace_member import WorkspaceMemberRepository
from app.realtime.activity_stream import ActivityStreamBroker
from app.realtime.audit_stream import AuditStreamBroker
from app.realtime.registry import activity_stream_broker, audit_stream_broker
from app.services.attachment import AttachmentService
from app.services.activity import ActivityService
from app.services.audit import AuditService
from app.services.comment import CommentService
from app.services.dashboard import DashboardService
from app.services.permission import PermissionService
from app.services.project import ProjectService
from app.services.task import TaskService
from app.services.task_assignment import TaskAssignmentService
from app.services.settings import SettingsService
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
    token_version = payload.get("ver", 0)
    if (
        user is None
        or not user.is_active
        or user.deleted_at is not None
        or not isinstance(token_version, int)
        or token_version != user.auth_version
    ):
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


def get_settings_service(session: SessionDep) -> SettingsService:
    return SettingsService(
        UserRepository(session),
        UserPreferenceRepository(session),
        WorkspaceRepository(session),
        WorkspaceMemberRepository(session),
    )


SettingsServiceDep = Annotated[SettingsService, Depends(get_settings_service)]


def get_project_service(session: SessionDep) -> ProjectService:
    workspace_repository = WorkspaceRepository(session)
    member_repository = WorkspaceMemberRepository(session)
    return ProjectService(
        ProjectRepository(session),
        workspace_repository,
        PermissionService(member_repository, workspace_repository),
    )


ProjectServiceDep = Annotated[ProjectService, Depends(get_project_service)]


def get_task_service(session: SessionDep) -> TaskService:
    workspace_repository = WorkspaceRepository(session)
    return TaskService(
        TaskRepository(session),
        ProjectRepository(session),
        PermissionService(
            WorkspaceMemberRepository(session),
            workspace_repository,
        ),
    )


TaskServiceDep = Annotated[TaskService, Depends(get_task_service)]


def get_attachment_service(session: SessionDep) -> AttachmentService:
    workspace_repository = WorkspaceRepository(session)
    return AttachmentService(
        AttachmentRepository(session),
        TaskRepository(session),
        PermissionService(
            WorkspaceMemberRepository(session),
            workspace_repository,
        ),
        settings.storage_path,
    )


AttachmentServiceDep = Annotated[AttachmentService, Depends(get_attachment_service)]


def get_comment_service(session: SessionDep) -> CommentService:
    workspace_repository = WorkspaceRepository(session)
    return CommentService(
        CommentRepository(session),
        TaskRepository(session),
        PermissionService(
            WorkspaceMemberRepository(session),
            workspace_repository,
        ),
    )


CommentServiceDep = Annotated[CommentService, Depends(get_comment_service)]


def get_task_assignment_service(session: SessionDep) -> TaskAssignmentService:
    workspace_repository = WorkspaceRepository(session)
    member_repository = WorkspaceMemberRepository(session)
    return TaskAssignmentService(
        TaskRepository(session),
        member_repository,
        PermissionService(member_repository, workspace_repository),
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


def get_activity_stream_broker() -> ActivityStreamBroker:
    return activity_stream_broker


ActivityStreamBrokerDep = Annotated[
    ActivityStreamBroker,
    Depends(get_activity_stream_broker),
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


def get_audit_stream_broker() -> AuditStreamBroker:
    return audit_stream_broker


AuditStreamBrokerDep = Annotated[
    AuditStreamBroker,
    Depends(get_audit_stream_broker),
]


def get_ai_provider_dependency() -> AIProvider:
    try:
        return get_ai_provider()
    except AIProviderConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="TaskMiner AI is not configured.",
        ) from exc


AIProviderDep = Annotated[AIProvider, Depends(get_ai_provider_dependency)]


def get_ai_service(session: SessionDep, provider: AIProviderDep) -> AIService:
    member_repository = WorkspaceMemberRepository(session)
    workspace_repository = WorkspaceRepository(session)
    permission_service = PermissionService(
        member_repository,
        workspace_repository,
    )
    return AIService(
        provider,
        permission_service,
        ProjectRepository(session),
    )


AIServiceDep = Annotated[AIService, Depends(get_ai_service)]


def get_ai_apply_service(session: SessionDep) -> AIApplyService:
    project_repository = ProjectRepository(session)
    task_repository = TaskRepository(session)
    workspace_repository = WorkspaceRepository(session)
    member_repository = WorkspaceMemberRepository(session)
    permission_service = PermissionService(
        member_repository,
        workspace_repository,
    )
    return AIApplyService(
        AIPlanApplicationRepository(session),
        project_repository,
        member_repository,
        permission_service,
        ProjectService(
            project_repository,
            workspace_repository,
            permission_service,
        ),
        TaskService(task_repository, project_repository, permission_service),
        TaskAssignmentService(
            task_repository,
            member_repository,
            permission_service,
        ),
    )


AIApplyServiceDep = Annotated[AIApplyService, Depends(get_ai_apply_service)]


def get_ai_change_plan_service(
    session: SessionDep,
    provider: AIProviderDep,
) -> AIProjectChangePlanService:
    member_repository = WorkspaceMemberRepository(session)
    workspace_repository = WorkspaceRepository(session)
    permission_service = PermissionService(
        member_repository,
        workspace_repository,
    )
    return AIProjectChangePlanService(
        provider,
        permission_service,
        ProjectRepository(session),
        TaskRepository(session),
    )


AIProjectChangePlanServiceDep = Annotated[
    AIProjectChangePlanService,
    Depends(get_ai_change_plan_service),
]


def get_ai_change_apply_service(session: SessionDep) -> AIProjectChangeApplyService:
    project_repository = ProjectRepository(session)
    task_repository = TaskRepository(session)
    workspace_repository = WorkspaceRepository(session)
    member_repository = WorkspaceMemberRepository(session)
    permission_service = PermissionService(
        member_repository,
        workspace_repository,
    )
    return AIProjectChangeApplyService(
        AIPlanApplicationRepository(session),
        project_repository,
        task_repository,
        permission_service,
        TaskService(task_repository, project_repository, permission_service),
    )


AIProjectChangeApplyServiceDep = Annotated[
    AIProjectChangeApplyService,
    Depends(get_ai_change_apply_service),
]
