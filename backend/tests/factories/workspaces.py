from dataclasses import dataclass
from typing import cast
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.workspace import Workspace
from app.models.workspace_subscription import WorkspaceSubscription
from app.subscriptions.plans import PlanCode, SubscriptionStatus
from tests.factories.users import RegisteredUser


@dataclass(frozen=True)
class CreatedWorkspace:
    id: UUID
    name: str
    description: str | None
    owner: RegisteredUser


class WorkspaceFactory:
    def __init__(self, client: TestClient, session: Session) -> None:
        self.client = client
        self.session = session

    def create(
        self,
        owner: RegisteredUser,
        *,
        name: str | None = None,
        description: str | None = "Test workspace description",
        ensure_capacity: bool = True,
    ) -> CreatedWorkspace:
        if ensure_capacity:
            self._ensure_capacity(owner.id)
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

    def _ensure_capacity(self, owner_id: UUID) -> None:
        subscription = self.session.scalar(
            select(WorkspaceSubscription)
            .join(Workspace, WorkspaceSubscription.workspace_id == Workspace.id)
            .where(
                Workspace.owner_id == owner_id,
                Workspace.deleted_at.is_(None),
            )
            .limit(1)
        )
        if subscription is None:
            return
        subscription.plan_code = PlanCode.PRO
        subscription.status = SubscriptionStatus.ACTIVE
        self.session.commit()
