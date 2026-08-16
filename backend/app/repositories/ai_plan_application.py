from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ai_plan_application import AIPlanApplication
from app.models.user import User


class AIPlanApplicationRepository:
    """Persistence for atomic AI apply idempotency records."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def get(
        self,
        user: User,
        workspace_id: UUID,
        idempotency_key: UUID,
    ) -> AIPlanApplication | None:
        statement = select(AIPlanApplication).where(
            AIPlanApplication.user_id == user.id,
            AIPlanApplication.workspace_id == workspace_id,
            AIPlanApplication.idempotency_key == idempotency_key,
        )
        return self.session.scalar(statement)

    def reserve(
        self,
        user: User,
        workspace_id: UUID,
        idempotency_key: UUID,
        request_hash: str,
        *,
        created_project: bool,
    ) -> AIPlanApplication:
        application = AIPlanApplication(
            user_id=user.id,
            workspace_id=workspace_id,
            idempotency_key=idempotency_key,
            request_hash=request_hash,
            created_project=created_project,
            created_task_ids=[],
        )
        self.session.add(application)
        self.session.flush()
        return application

    def complete(
        self,
        application: AIPlanApplication,
        project_id: UUID,
        task_ids: list[UUID],
        skipped_task_count: int,
    ) -> None:
        application.project_id = project_id
        application.created_task_ids = [str(task_id) for task_id in task_ids]
        application.skipped_task_count = skipped_task_count
        self.session.flush()

    def commit(self) -> None:
        self.session.commit()

    def rollback(self) -> None:
        self.session.rollback()
