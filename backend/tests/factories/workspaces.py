from dataclasses import dataclass
from typing import cast
from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from tests.factories.users import RegisteredUser


@dataclass(frozen=True)
class CreatedWorkspace:
    id: UUID
    name: str
    description: str | None
    owner: RegisteredUser


class WorkspaceFactory:
    def __init__(self, client: TestClient) -> None:
        self.client = client

    def create(
        self,
        owner: RegisteredUser,
        *,
        name: str | None = None,
        description: str | None = "Test workspace description",
    ) -> CreatedWorkspace:
        workspace_name = name or f"Workspace {uuid4().hex[:8]}"
        response = self.client.post(
            "/api/v1/workspaces",
            headers=owner.headers,
            json={"name": workspace_name, "description": description},
        )
        assert response.status_code == 201, response.text

        data = cast(dict[str, object], response.json())
        return CreatedWorkspace(
            id=UUID(str(data["id"])),
            name=workspace_name,
            description=description,
            owner=owner,
        )
