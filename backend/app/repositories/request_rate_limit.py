from datetime import datetime

from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models.request_rate_limit_bucket import RequestRateLimitBucket


class RequestRateLimitRepository:
    """Atomic PostgreSQL counters shared by every application instance."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def reserve(
        self,
        *,
        action: str,
        scope_type: str,
        scope_hash: str,
        window_start: datetime,
        limit: int,
    ) -> bool:
        statement = (
            insert(RequestRateLimitBucket)
            .values(
                action=action,
                scope_type=scope_type,
                scope_hash=scope_hash,
                window_start=window_start,
                request_count=1,
            )
            .on_conflict_do_update(
                constraint="uq_request_rate_limit_bucket_scope_window",
                set_={
                    "request_count": RequestRateLimitBucket.request_count + 1,
                },
                where=RequestRateLimitBucket.request_count < limit,
            )
            .returning(RequestRateLimitBucket.request_count)
        )
        return self.session.scalar(statement) is not None

    def delete_before(self, cutoff: datetime) -> None:
        self.session.execute(
            delete(RequestRateLimitBucket).where(
                RequestRateLimitBucket.window_start < cutoff
            )
        )

    def commit(self) -> None:
        self.session.commit()

    def rollback(self) -> None:
        self.session.rollback()
