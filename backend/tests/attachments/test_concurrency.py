from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.attachment import Attachment
from app.repositories.attachment import AttachmentRepository
from tests.factories import CreatedTask


def test_concurrent_uploads_cannot_exceed_workspace_quota(
    client: TestClient,
    task: CreatedTask,
    database_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "attachment_workspace_quota_bytes", 10)
    barrier = Barrier(2)
    original_lock = AttachmentRepository.lock_workspace

    def synchronize_before_lock(
        self: AttachmentRepository,
        workspace_id,
    ) -> None:
        barrier.wait(timeout=5)
        original_lock(self, workspace_id)

    monkeypatch.setattr(AttachmentRepository, "lock_workspace", synchronize_before_lock)

    def upload(index: int) -> int:
        response = client.post(
            f"/api/v1/tasks/{task.id}/attachments",
            headers=task.project.owner.headers,
            files={"file": (f"upload-{index}.txt", b"123456", "text/plain")},
        )
        return response.status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        statuses = sorted(executor.map(upload, range(2)))

    assert statuses == [201, 409]
    database_session.expire_all()
    assert database_session.scalar(select(func.count(Attachment.id))) == 1
    stored_files = [path for path in settings.storage_path.iterdir() if path.is_file()]
    assert len(stored_files) == 1
