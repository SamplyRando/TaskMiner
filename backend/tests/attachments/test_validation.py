from pathlib import Path

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.attachment import Attachment
from app.services.attachment import MAX_FILE_SIZE_BYTES
from tests.factories import CreatedTask


@pytest.mark.parametrize(
    "extension", ["pdf", "png", "jpg", "jpeg", "txt", "csv", "zip"]
)
def test_allowed_extensions_are_accepted_case_insensitively(
    client: TestClient,
    task: CreatedTask,
    extension: str,
) -> None:
    response = client.post(
        f"/api/v1/tasks/{task.id}/attachments",
        headers=task.project.owner.headers,
        files={
            "file": (
                f"allowed.{extension.upper()}",
                b"allowed content",
                "application/octet-stream",
            )
        },
    )

    assert response.status_code == 201


def test_forbidden_extension_returns_415_without_side_effects(
    client: TestClient,
    task: CreatedTask,
    database_session: Session,
) -> None:
    response = client.post(
        f"/api/v1/tasks/{task.id}/attachments",
        headers=task.project.owner.headers,
        files={"file": ("malware.exe", b"forbidden", "application/octet-stream")},
    )

    assert response.status_code == 415
    assert response.json() == {"detail": "File extension is not allowed."}
    assert database_session.scalar(select(func.count(Attachment.id))) == 0
    assert list(settings.storage_path.iterdir()) == []


def test_file_at_size_limit_is_accepted(
    client: TestClient,
    task: CreatedTask,
) -> None:
    response = client.post(
        f"/api/v1/tasks/{task.id}/attachments",
        headers=task.project.owner.headers,
        files={
            "file": (
                "maximum.zip",
                b"x" * MAX_FILE_SIZE_BYTES,
                "application/zip",
            )
        },
    )

    assert response.status_code == 201
    assert response.json()["file_size"] == MAX_FILE_SIZE_BYTES


def test_file_over_size_limit_returns_413_without_side_effects(
    client: TestClient,
    task: CreatedTask,
    database_session: Session,
) -> None:
    response = client.post(
        f"/api/v1/tasks/{task.id}/attachments",
        headers=task.project.owner.headers,
        files={
            "file": (
                "too-large.zip",
                b"x" * (MAX_FILE_SIZE_BYTES + 1),
                "application/zip",
            )
        },
    )

    assert response.status_code == 413
    assert response.json() == {"detail": "File exceeds the maximum size of 10 MB."}
    assert database_session.scalar(select(func.count(Attachment.id))) == 0
    assert list(settings.storage_path.iterdir()) == []


def test_uploaded_path_is_reduced_to_original_basename(
    client: TestClient,
    task: CreatedTask,
) -> None:
    response = client.post(
        f"/api/v1/tasks/{task.id}/attachments",
        headers=task.project.owner.headers,
        files={"file": ("../report.pdf", b"report", "application/pdf")},
    )

    assert response.status_code == 201
    assert response.json()["filename"] == Path("report.pdf").name
