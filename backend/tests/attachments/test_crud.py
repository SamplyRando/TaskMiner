from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.attachment import Attachment
from tests.factories import (
    AttachmentFactory,
    CreatedAttachment,
    CreatedTask,
)


def test_upload_stores_file_and_metadata(
    client: TestClient,
    task: CreatedTask,
    database_session: Session,
) -> None:
    content = b"PDF file content"

    first_response = client.post(
        f"/api/v1/tasks/{task.id}/attachments",
        headers=task.project.owner.headers,
        files={"file": ("dashboard.PDF", content, "application/pdf")},
    )
    second_response = client.post(
        f"/api/v1/tasks/{task.id}/attachments",
        headers=task.project.owner.headers,
        files={"file": ("dashboard.PDF", content, "application/pdf")},
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 201
    first_data = first_response.json()
    second_data = second_response.json()
    assert first_data["filename"] == "dashboard.PDF"
    assert first_data["content_type"] == "application/pdf"
    assert first_data["file_size"] == len(content)
    assert first_data["task_id"] == str(task.id)
    assert "stored_filename" not in first_data
    assert "deleted_at" not in first_data

    first_attachment = database_session.get(Attachment, first_data["id"])
    second_attachment = database_session.get(Attachment, second_data["id"])
    assert first_attachment is not None
    assert second_attachment is not None
    assert first_attachment.stored_filename != second_attachment.stored_filename
    assert first_attachment.stored_filename.endswith(".pdf")
    assert (
        settings.storage_path / first_attachment.stored_filename
    ).read_bytes() == content
    assert (
        settings.storage_path / second_attachment.stored_filename
    ).read_bytes() == content


def test_download_returns_original_file(
    client: TestClient,
    attachment: CreatedAttachment,
) -> None:
    response = client.get(
        f"/api/v1/attachments/{attachment.id}",
        headers=attachment.task.project.owner.headers,
    )

    assert response.status_code == 200
    assert response.content == attachment.content
    assert response.headers["content-type"].startswith("text/plain")
    assert response.headers["content-disposition"] == (
        f'attachment; filename="{attachment.filename}"'
    )


def test_list_task_attachments(
    client: TestClient,
    task: CreatedTask,
    attachment_factory: AttachmentFactory,
) -> None:
    first = attachment_factory.create(task, filename="report.pdf")
    second = attachment_factory.create(task, filename="screenshot.png")

    response = client.get(
        f"/api/v1/tasks/{task.id}/attachments",
        headers=task.project.owner.headers,
    )

    assert response.status_code == 200
    assert {item["id"] for item in response.json()} == {
        str(first.id),
        str(second.id),
    }


def test_delete_attachment_is_soft_delete_and_keeps_file(
    client: TestClient,
    attachment: CreatedAttachment,
    database_session: Session,
) -> None:
    attachment_before = database_session.get(Attachment, attachment.id)
    assert attachment_before is not None
    stored_path = settings.storage_path / attachment_before.stored_filename
    updated_at = attachment_before.updated_at

    response = client.delete(
        f"/api/v1/attachments/{attachment.id}",
        headers=attachment.task.project.owner.headers,
    )

    assert response.status_code == 204
    assert stored_path.is_file()
    assert stored_path.read_bytes() == attachment.content

    database_session.expire_all()
    deleted_attachment = database_session.get(Attachment, attachment.id)
    assert deleted_attachment is not None
    assert deleted_attachment.deleted_at is not None
    assert deleted_attachment.deleted_at.utcoffset() == timedelta(0)
    assert deleted_attachment.updated_at >= updated_at

    list_response = client.get(
        f"/api/v1/tasks/{attachment.task.id}/attachments",
        headers=attachment.task.project.owner.headers,
    )
    download_response = client.get(
        f"/api/v1/attachments/{attachment.id}",
        headers=attachment.task.project.owner.headers,
    )
    second_delete_response = client.delete(
        f"/api/v1/attachments/{attachment.id}",
        headers=attachment.task.project.owner.headers,
    )

    assert list_response.status_code == 200
    assert list_response.json() == []
    assert download_response.status_code == 404
    assert second_delete_response.status_code == 404
