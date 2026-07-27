from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.api.deps import AttachmentServiceDep, CurrentUserDep
from app.models.attachment import Attachment
from app.schemas.attachment import AttachmentRead
from app.services.attachment import (
    AttachmentExtensionNotAllowedError,
    AttachmentNotFoundError,
    AttachmentTaskNotFoundError,
    AttachmentTooLargeError,
)


router = APIRouter()
task_router = APIRouter()


@task_router.post(
    "/{task_id}/attachments",
    response_model=AttachmentRead,
    status_code=status.HTTP_201_CREATED,
)
def upload_attachment(
    task_id: UUID,
    file: Annotated[UploadFile, File()],
    current_user: CurrentUserDep,
    service: AttachmentServiceDep,
) -> Attachment:
    try:
        return service.upload_attachment(current_user, task_id, file)
    except AttachmentTaskNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        ) from exc
    except AttachmentTooLargeError as exc:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="File exceeds the maximum size of 10 MB.",
        ) from exc
    except AttachmentExtensionNotAllowedError as exc:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File extension is not allowed.",
        ) from exc


@task_router.get(
    "/{task_id}/attachments",
    response_model=list[AttachmentRead],
)
def list_attachments(
    task_id: UUID,
    current_user: CurrentUserDep,
    service: AttachmentServiceDep,
) -> list[Attachment]:
    try:
        return service.list_attachments(current_user, task_id)
    except AttachmentTaskNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        ) from exc


@router.get("/{attachment_id}", response_class=FileResponse)
def download_attachment(
    attachment_id: UUID,
    current_user: CurrentUserDep,
    service: AttachmentServiceDep,
) -> FileResponse:
    try:
        download = service.get_download(current_user, attachment_id)
    except AttachmentNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found.",
        ) from exc

    return FileResponse(
        path=download.path,
        filename=download.filename,
        media_type=download.content_type,
    )


@router.delete(
    "/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_attachment(
    attachment_id: UUID,
    current_user: CurrentUserDep,
    service: AttachmentServiceDep,
) -> None:
    try:
        service.delete_attachment(current_user, attachment_id)
    except AttachmentNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found.",
        ) from exc
