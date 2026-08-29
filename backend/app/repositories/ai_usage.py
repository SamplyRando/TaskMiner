from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models.ai_usage_event import AIUsageEvent
from app.models.workspace import Workspace


@dataclass(frozen=True)
class AIUsageAggregate:
    requests_used: int
    successful_requests: int
    failed_requests: int
    input_tokens: int
    output_tokens: int
    total_tokens: int
    estimated_cost_usd: Decimal
    average_latency_ms: int | None


class AIUsageRepository:
    """PostgreSQL persistence used by AI quota, rate, and usage reporting."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def lock_workspace(self, workspace_id: UUID) -> None:
        statement = (
            select(Workspace.id).where(Workspace.id == workspace_id).with_for_update()
        )
        self.session.execute(statement).scalar_one()

    def count_workspace_requests(
        self,
        workspace_id: UUID,
        start: datetime,
        end: datetime,
    ) -> int:
        statement = select(func.count(AIUsageEvent.id)).where(
            AIUsageEvent.workspace_id == workspace_id,
            AIUsageEvent.created_at >= start,
            AIUsageEvent.created_at < end,
        )
        return int(self.session.scalar(statement) or 0)

    def count_user_requests_since(
        self,
        workspace_id: UUID,
        user_id: UUID,
        since: datetime,
    ) -> int:
        statement = select(func.count(AIUsageEvent.id)).where(
            AIUsageEvent.workspace_id == workspace_id,
            AIUsageEvent.user_id == user_id,
            AIUsageEvent.created_at >= since,
        )
        return int(self.session.scalar(statement) or 0)

    def oldest_user_request_since(
        self,
        workspace_id: UUID,
        user_id: UUID,
        since: datetime,
    ) -> datetime | None:
        statement = select(func.min(AIUsageEvent.created_at)).where(
            AIUsageEvent.workspace_id == workspace_id,
            AIUsageEvent.user_id == user_id,
            AIUsageEvent.created_at >= since,
        )
        return self.session.scalar(statement)

    def create_started(
        self,
        *,
        workspace_id: UUID,
        user_id: UUID,
        operation_type: str,
        provider: str,
        model: str,
        created_at: datetime,
    ) -> AIUsageEvent:
        event = AIUsageEvent(
            workspace_id=workspace_id,
            user_id=user_id,
            operation_type=operation_type,
            provider=provider,
            model=model,
            status="started",
            created_at=created_at,
        )
        self.session.add(event)
        self.session.flush()
        return event

    def get(self, event_id: UUID) -> AIUsageEvent | None:
        return self.session.get(AIUsageEvent, event_id)

    def complete_success(
        self,
        event: AIUsageEvent,
        *,
        input_tokens: int | None,
        output_tokens: int | None,
        total_tokens: int | None,
        estimated_cost_usd: Decimal | None,
        latency_ms: int,
    ) -> None:
        event.status = "success"
        event.input_tokens = input_tokens
        event.output_tokens = output_tokens
        event.total_tokens = total_tokens
        event.estimated_cost_usd = estimated_cost_usd
        event.latency_ms = latency_ms
        event.error_code = None
        self.session.flush()

    def complete_failure(
        self,
        event: AIUsageEvent,
        *,
        latency_ms: int,
        error_code: str,
    ) -> None:
        event.status = "failed"
        event.latency_ms = latency_ms
        event.error_code = error_code
        self.session.flush()

    def aggregate(
        self,
        workspace_id: UUID,
        start: datetime,
        end: datetime,
    ) -> AIUsageAggregate:
        statement = select(
            func.count(AIUsageEvent.id),
            func.sum(case((AIUsageEvent.status == "success", 1), else_=0)),
            func.sum(case((AIUsageEvent.status == "failed", 1), else_=0)),
            func.coalesce(func.sum(AIUsageEvent.input_tokens), 0),
            func.coalesce(func.sum(AIUsageEvent.output_tokens), 0),
            func.coalesce(func.sum(AIUsageEvent.total_tokens), 0),
            func.coalesce(func.sum(AIUsageEvent.estimated_cost_usd), 0),
            func.avg(AIUsageEvent.latency_ms),
        ).where(
            AIUsageEvent.workspace_id == workspace_id,
            AIUsageEvent.created_at >= start,
            AIUsageEvent.created_at < end,
        )
        row = self.session.execute(statement).one()
        average_latency = row[7]
        return AIUsageAggregate(
            requests_used=int(row[0] or 0),
            successful_requests=int(row[1] or 0),
            failed_requests=int(row[2] or 0),
            input_tokens=int(row[3] or 0),
            output_tokens=int(row[4] or 0),
            total_tokens=int(row[5] or 0),
            estimated_cost_usd=Decimal(row[6] or 0),
            average_latency_ms=(
                int(round(float(average_latency)))
                if average_latency is not None
                else None
            ),
        )

    def commit(self) -> None:
        self.session.commit()

    def rollback(self) -> None:
        self.session.rollback()
