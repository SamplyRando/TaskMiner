from dataclasses import dataclass
from typing import cast
from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from tests.factories.projects import CreatedProject


@dataclass(frozen=True)
class CreatedTask:
    id: UUID
    title: str
    project: CreatedProject


class TaskFactory:
    def __init__(self, client: TestClient) -> None:
        self.client = client

    def create(
        self,
        project: CreatedProject,
        *,
        title: str | None = None,
        description: str | None = "Test task description",
        status: str = "todo",
        priority: str = "medium",
    ) -> CreatedTask:
        task_title = title or f"Task {uuid4().hex[:8]}"
        response = self.client.post(
            f"/api/v1/projects/{project.id}/tasks",
            headers=project.owner.headers,
            json={
                "title": task_title,
                "description": description,
                "status": status,
                "priority": priority,
            },
        )
        assert response.status_code == 201, response.text

        data = cast(dict[str, object], response.json())
        return CreatedTask(
            id=UUID(str(data["id"])),
            title=task_title,
            project=project,
        )
