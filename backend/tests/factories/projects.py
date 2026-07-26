from dataclasses import dataclass
from typing import cast
from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from tests.factories.users import RegisteredUser


@dataclass(frozen=True)
class CreatedProject:
    id: UUID
    name: str
    description: str | None
    owner: RegisteredUser


class ProjectFactory:
    def __init__(self, client: TestClient) -> None:
        self.client = client

    def create(
        self,
        owner: RegisteredUser,
        *,
        name: str | None = None,
        description: str | None = "Test project description",
    ) -> CreatedProject:
        project_name = name or f"Project {uuid4().hex[:8]}"
        response = self.client.post(
            "/api/v1/projects",
            headers=owner.headers,
            json={"name": project_name, "description": description},
        )
        assert response.status_code == 201, response.text

        data = cast(dict[str, object], response.json())
        return CreatedProject(
            id=UUID(str(data["id"])),
            name=project_name,
            description=description,
            owner=owner,
        )
