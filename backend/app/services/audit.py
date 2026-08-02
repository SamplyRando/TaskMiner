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
            params=params,
        )
        return AuditFeed(
            items=[AuditRead.from_audit_log(log) for log in logs],
            count=count,
        )

    def prepare_stream(
        self,
        user: User,
        workspace_id: UUID,
        last_event_id: UUID | None,
    ) -> list[AuditRead]:
        workspace = self.permission_service.require_audit_view(user, workspace_id)
        if last_event_id is None:
            return []
        return [
            AuditRead.from_audit_log(audit_log)
            for audit_log in self.repository.list_after(
                workspace,
                last_event_id,
            )
        ]
