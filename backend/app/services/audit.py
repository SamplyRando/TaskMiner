from uuid import UUID

from app.models.user import User
from app.repositories.audit import AuditRepository
from app.schemas.audit import AuditFeed, AuditListParams, AuditRead
from app.services.permission import PermissionService


class AuditService:
    """Application service for filtered, read-only workspace audit logs."""

    def __init__(
        self,
        repository: AuditRepository,
        permission_service: PermissionService,
    ) -> None:
        self.repository = repository
        self.permission_service = permission_service

    def list_workspace_logs(
        self,
        user: User,
        workspace_id: UUID,
        params: AuditListParams,
    ) -> AuditFeed:
        workspace = self.permission_service.require_audit_view(user, workspace_id)
        logs, count = self.repository.list_workspace_logs(
            workspace,
            offset=params.offset,
            limit=params.limit,
            event_type=params.event_type,
            resource_type=params.resource_type,
        )
        return AuditFeed(
            items=[AuditRead.model_validate(log) for log in logs],
            count=count,
        )
