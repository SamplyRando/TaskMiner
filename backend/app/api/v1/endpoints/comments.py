from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CommentServiceDep, CurrentUserDep
from app.models.comment import Comment
from app.schemas.comment import CommentCreate, CommentRead, CommentUpdate
from app.services.comment import CommentNotFoundError, CommentTaskNotFoundError


router = APIRouter()
task_router = APIRouter()


@task_router.post(
    "/{task_id}/comments",
    response_model=CommentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    task_id: UUID,
    data: CommentCreate,
    current_user: CurrentUserDep,
    service: CommentServiceDep,
) -> Comment:
    try:
        return service.create_comment(current_user, task_id, data)
    except CommentTaskNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        ) from exc


@task_router.get(
    "/{task_id}/comments",
    response_model=list[CommentRead],
)
def list_comments(
    task_id: UUID,
    current_user: CurrentUserDep,
    service: CommentServiceDep,
) -> list[Comment]:
    try:
        return service.list_comments(current_user, task_id)
    except CommentTaskNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        ) from exc


@router.get("/{comment_id}", response_model=CommentRead)
def get_comment(
    comment_id: UUID,
    current_user: CurrentUserDep,
    service: CommentServiceDep,
) -> Comment:
    try:
        return service.get_comment(current_user, comment_id)
    except CommentNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found.",
        ) from exc


@router.patch("/{comment_id}", response_model=CommentRead)
def update_comment(
    comment_id: UUID,
    data: CommentUpdate,
    current_user: CurrentUserDep,
    service: CommentServiceDep,
) -> Comment:
    try:
        return service.update_comment(current_user, comment_id, data)
    except CommentNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found.",
        ) from exc


@router.delete(
    "/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_comment(
    comment_id: UUID,
    current_user: CurrentUserDep,
    service: CommentServiceDep,
) -> None:
    try:
        service.delete_comment(current_user, comment_id)
    except CommentNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found.",
        ) from exc
