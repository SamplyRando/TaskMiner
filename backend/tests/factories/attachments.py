from dataclasses import dataclass
from typing import cast
from uuid import UUID

from fastapi.testclient import TestClient

from tests.factories.tasks import CreatedTask


@dataclass(frozen=True)
class CreatedAttachment:
    id: UUID
    filename: str
    content: bytes
    task: CreatedTask


class AttachmentFactory:
    def __init__(self, client: TestClient) -> None:
        self.client = client

    def create(
        self,
        task: CreatedTask,
        *,
        filename: str = "attachment.txt",
        content: bytes = b"TaskMiner attachment content",
        content_type: str = "text/plain",
    ) -> CreatedAttachment:
        response = self.client.post(
            f"/api/v1/tasks/{task.id}/attachments",
            headers=task.project.owner.headers,
            files={"file": (filename, content, content_type)},
        )
        assert response.status_code == 201, response.text

        data = cast(dict[str, object], response.json())
        return CreatedAttachment(
            id=UUID(str(data["id"])),
            filename=filename,
            content=content,
            task=task,
        )
