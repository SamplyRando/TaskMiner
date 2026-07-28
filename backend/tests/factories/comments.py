from dataclasses import dataclass
from typing import cast
from uuid import UUID

from fastapi.testclient import TestClient

from tests.factories.tasks import CreatedTask


@dataclass(frozen=True)
class CreatedComment:
    id: UUID
    content: str
    task: CreatedTask


class CommentFactory:
    def __init__(self, client: TestClient) -> None:
        self.client = client

    def create(
        self,
        task: CreatedTask,
        *,
        content: str = "TaskMiner test comment",
    ) -> CreatedComment:
        response = self.client.post(
            f"/api/v1/tasks/{task.id}/comments",
            headers=task.project.owner.headers,
            json={"content": content},
        )
        assert response.status_code == 201, response.text

        data = cast(dict[str, object], response.json())
        return CreatedComment(
            id=UUID(str(data["id"])),
            content=content,
            task=task,
        )
