from pathlib import Path

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.attachment import Attachment
from app.services.attachment import MAX_FILE_SIZE_BYTES
from tests.factories import CreatedTask, ProjectFactory, RegisteredUser, TaskFactory


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


def test_workspace_storage_quota_allows_exact_limit_and_rejects_overage(
    client: TestClient,
    task: CreatedTask,
    database_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "attachment_workspace_quota_bytes", 10)

    exact = client.post(
        f"/api/v1/tasks/{task.id}/attachments",
        headers=task.project.owner.headers,
        files={"file": ("exact.txt", b"1234567890", "text/plain")},
    )
    over = client.post(
        f"/api/v1/tasks/{task.id}/attachments",
        headers=task.project.owner.headers,
        files={"file": ("over.txt", b"x", "text/plain")},
    )

    assert exact.status_code == 201
    assert over.status_code == 409
    assert over.json()["detail"]["code"] == "attachment_storage_quota_exceeded"
    assert database_session.scalar(select(func.count(Attachment.id))) == 1
    stored_files = [path for path in settings.storage_path.iterdir() if path.is_file()]
    assert len(stored_files) == 1
    assert stored_files[0].read_bytes() == b"1234567890"


def test_attachment_upload_rate_limit_is_shared_and_returns_retry_after(
    client: TestClient,
    task: CreatedTask,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "attachment_upload_rate_limit_requests", 1)

    accepted = client.post(
        f"/api/v1/tasks/{task.id}/attachments",
        headers=task.project.owner.headers,
        files={"file": ("first.txt", b"first", "text/plain")},
    )
    blocked = client.post(
        f"/api/v1/tasks/{task.id}/attachments",
        headers=task.project.owner.headers,
        files={"file": ("second.txt", b"second", "text/plain")},
    )

    assert accepted.status_code == 201
    assert blocked.status_code == 429
    assert blocked.json()["detail"]["code"] == ("attachment_upload_rate_limit_exceeded")
    assert 1 <= int(blocked.headers["Retry-After"]) <= 60


def test_database_failure_after_file_staging_leaves_no_orphan(
    client: TestClient,
    task: CreatedTask,
    database_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.repositories.attachment import AttachmentRepository

    def fail_commit(self: AttachmentRepository) -> None:
        raise RuntimeError("database write failed")

    monkeypatch.setattr(AttachmentRepository, "commit", fail_commit)

    with pytest.raises(RuntimeError, match="database write failed"):
        client.post(
            f"/api/v1/tasks/{task.id}/attachments",
            headers=task.project.owner.headers,
            files={"file": ("orphan.txt", b"orphan", "text/plain")},
        )

    database_session.expire_all()
    assert database_session.scalar(select(func.count(Attachment.id))) == 0
    assert list(settings.storage_path.iterdir()) == []


def test_workspace_storage_quotas_are_isolated(
    client: TestClient,
    task: CreatedTask,
    other_user: RegisteredUser,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "attachment_workspace_quota_bytes", 5)
    other_task = task_factory.create(project_factory.create(other_user))

    first = client.post(
        f"/api/v1/tasks/{task.id}/attachments",
        headers=task.project.owner.headers,
        files={"file": ("first.txt", b"12345", "text/plain")},
    )
    second = client.post(
        f"/api/v1/tasks/{other_task.id}/attachments",
        headers=other_task.project.owner.headers,
        files={"file": ("second.txt", b"67890", "text/plain")},
    )

    assert first.status_code == 201
    assert second.status_code == 201
