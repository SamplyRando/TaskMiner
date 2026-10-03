from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUserDep, NotificationServiceDep
from app.models.notification import Notification
from app.schemas.notification import (
    NotificationMarkAllResult,
    NotificationPage,
    NotificationRead,
    NotificationUnreadCount,
)
from app.services.notification import NotificationNotFoundError


router = APIRouter()


@router.get("", response_model=NotificationPage)
def list_notifications(
    current_user: CurrentUserDep,
    service: NotificationServiceDep,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> NotificationPage:
    items, total = service.list_notifications(
        current_user,
        offset=offset,
        limit=limit,
    )
    return NotificationPage(
        items=[NotificationRead.model_validate(item) for item in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get("/unread-count", response_model=NotificationUnreadCount)
def unread_count(
    current_user: CurrentUserDep,
    service: NotificationServiceDep,
) -> NotificationUnreadCount:
    return NotificationUnreadCount(
        unread_count=service.unread_count(current_user),
    )


@router.patch("/read-all", response_model=NotificationMarkAllResult)
def mark_all_read(
    current_user: CurrentUserDep,
    service: NotificationServiceDep,
) -> NotificationMarkAllResult:
    return NotificationMarkAllResult(
        updated_count=service.mark_all_read(current_user),
    )


@router.patch("/{notification_id}/read", response_model=NotificationRead)
def mark_read(
    notification_id: UUID,
    current_user: CurrentUserDep,
    service: NotificationServiceDep,
) -> Notification:
    try:
        return service.mark_read(current_user, notification_id)
    except NotificationNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        ) from exc


@router.patch("/{notification_id}/unread", response_model=NotificationRead)
def mark_unread(
    notification_id: UUID,
    current_user: CurrentUserDep,
    service: NotificationServiceDep,
) -> Notification:
    try:
        return service.mark_unread(current_user, notification_id)
    except NotificationNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        ) from exc
