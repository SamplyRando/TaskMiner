from dataclasses import dataclass
from typing import cast
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.workspace import Workspace
from app.models.workspace_subscription import WorkspaceSubscription
from app.subscriptions.plans import PlanCode, SubscriptionStatus
from tests.factories.users import RegisteredUser


@dataclass(frozen=True)
class CreatedProject:
    id: UUID
    workspace_id: UUID
    name: str
    description: str | None
    owner: RegisteredUser


class ProjectFactory:
    def __init__(self, client: TestClient, session: Session) -> None:
        self.client = client
        self.session = session

    def create(
        self,
        owner: RegisteredUser,
        *,
        name: str | None = None,
        description: str | None = "Test project description",
    ) -> CreatedProject:
        self._ensure_capacity(owner.id)
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
            workspace_id=UUID(str(data["workspace_id"])),
            name=project_name,
            description=description,
            owner=owner,
        )

    def _ensure_capacity(self, owner_id: UUID) -> None:
        workspace = self.session.scalar(
            select(Workspace)
            .where(
                Workspace.owner_id == owner_id,
                Workspace.deleted_at.is_(None),
            )
            .order_by(Workspace.created_at.asc())
            .limit(1)
        )
        if workspace is None:
            return
        project_count = int(
            self.session.scalar(
                select(func.count(Project.id)).where(
                    Project.workspace_id == workspace.id,
                    Project.deleted_at.is_(None),
                )
            )
            or 0
        )
        if project_count < 5:
            return
        subscription = self.session.scalar(
            select(WorkspaceSubscription).where(
                WorkspaceSubscription.workspace_id == workspace.id
            )
        )
        if subscription is not None:
            subscription.plan_code = PlanCode.PRO
            subscription.status = SubscriptionStatus.ACTIVE
            self.session.commit()
