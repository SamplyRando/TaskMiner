from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_ai_provider_dependency
from app.core.config import settings
from app.main import app
from app.models.ai_usage_event import AIUsageEvent
from app.models.project import Project
from app.models.task import Task
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMemberRole
from app.models.workspace_subscription import WorkspaceSubscription
from app.subscriptions.plans import PLAN_LIMITS, PlanCode, SubscriptionStatus
from tests.ai.test_apply import apply_payload
from tests.ai.test_usage import MeteredProvider
from tests.factories import (
    CreatedWorkspace,
    RegisteredUser,
    UserFactory,
    WorkspaceInvitationFactory,
    WorkspaceMemberFactory,
)


def promote_to_pro(workspace_id: UUID, session: Session) -> None:
    subscription = session.scalar(
        select(WorkspaceSubscription).where(
            WorkspaceSubscription.workspace_id == workspace_id
        )
    )
    assert subscription is not None
    subscription.plan_code = PlanCode.PRO
    subscription.status = SubscriptionStatus.ACTIVE
    session.commit()


def create_project(
    client: TestClient,
    workspace: CreatedWorkspace,
    name: str,
):
    return client.post(
        f"/api/v1/projects?workspace_id={workspace.id}",
        headers=workspace.owner.headers,
        json={"name": name, "description": None},
    )


def test_new_workspace_gets_free_subscription_and_free_owner_limit(
    client: TestClient,
    user: RegisteredUser,
    database_session: Session,
) -> None:
    created = client.post(
        "/api/v1/workspaces",
        headers=user.headers,
        json={"name": "First", "description": None},
    )
    blocked = client.post(
        "/api/v1/workspaces",
        headers=user.headers,
        json={"name": "Second", "description": None},
    )

    assert created.status_code == 201
    subscription = database_session.scalar(select(WorkspaceSubscription))
    assert subscription is not None
    assert subscription.plan_code == PlanCode.FREE
    assert subscription.status == SubscriptionStatus.ACTIVE
    assert blocked.status_code == 409
    assert blocked.json()["detail"] == {
        "code": "workspace_limit_reached",
        "message": "Workspace limit reached for the Free plan.",
        "plan": "free",
        "limit": 1,
    }


def test_central_plan_registry_defines_all_initial_limits() -> None:
    assert PLAN_LIMITS[PlanCode.FREE].owned_workspaces == 1
    assert PLAN_LIMITS[PlanCode.FREE].members_per_workspace == 3
    assert PLAN_LIMITS[PlanCode.FREE].projects_per_workspace == 5
    assert PLAN_LIMITS[PlanCode.FREE].ai_requests_per_month == 25
    assert PLAN_LIMITS[PlanCode.PRO].owned_workspaces == 10
    assert PLAN_LIMITS[PlanCode.PRO].members_per_workspace == 25
    assert PLAN_LIMITS[PlanCode.PRO].projects_per_workspace == 100
    assert PLAN_LIMITS[PlanCode.PRO].ai_requests_per_month == 500


def test_highest_owned_active_plan_controls_workspace_limit(
    client: TestClient,
    user: RegisteredUser,
    database_session: Session,
) -> None:
    first = client.post(
        "/api/v1/workspaces",
        headers=user.headers,
        json={"name": "Workspace 1"},
    )
    assert first.status_code == 201
    promote_to_pro(UUID(first.json()["id"]), database_session)

    for index in range(2, PLAN_LIMITS[PlanCode.PRO].owned_workspaces + 1):
        response = client.post(
            "/api/v1/workspaces",
            headers=user.headers,
            json={"name": f"Workspace {index}"},
        )
        assert response.status_code == 201

    blocked = client.post(
        "/api/v1/workspaces",
        headers=user.headers,
        json={"name": "Workspace 11"},
    )
    assert blocked.status_code == 409
    assert blocked.json()["detail"]["plan"] == "pro"
    assert blocked.json()["detail"]["limit"] == 10


def test_free_project_limit_ignores_soft_deleted_projects(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
) -> None:
    project_ids = []
    for index in range(5):
        response = create_project(client, workspace, f"Project {index}")
        assert response.status_code == 201
        project_ids.append(response.json()["id"])

    blocked = create_project(client, workspace, "Blocked")
    assert blocked.status_code == 409
    assert blocked.json()["detail"]["code"] == "project_limit_reached"

    deleted = client.delete(
        f"/api/v1/projects/{project_ids[0]}",
        headers=workspace.owner.headers,
    )
    assert deleted.status_code == 204
    replacement = create_project(client, workspace, "Replacement")
    assert replacement.status_code == 201
    assert (
        database_session.scalar(
            select(func.count(Project.id)).where(
                Project.workspace_id == workspace.id,
                Project.deleted_at.is_(None),
            )
        )
        == 5
    )


def test_pro_project_limit_is_enforced(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
) -> None:
    promote_to_pro(workspace.id, database_session)
    database_session.add_all(
        [
            Project(name=f"Project {index}", workspace_id=workspace.id)
            for index in range(100)
        ]
    )
    database_session.commit()

    blocked = create_project(client, workspace, "Project 101")

    assert blocked.status_code == 409
    assert blocked.json()["detail"]["plan"] == "pro"
    assert blocked.json()["detail"]["limit"] == 100


def test_invitation_acceptance_enforces_member_limit_with_owner_counted(
    client: TestClient,
    workspace: CreatedWorkspace,
    user_factory: UserFactory,
    workspace_member_factory: WorkspaceMemberFactory,
    workspace_invitation_factory: WorkspaceInvitationFactory,
) -> None:
    second = user_factory.create()
    third = user_factory.create()
    fourth = user_factory.create()
    workspace_member_factory.create(workspace, second)
    workspace_member_factory.create(workspace, third)
    invitation = workspace_invitation_factory.create(workspace, fourth)

    response = client.post(
        f"/api/v1/invitations/{invitation.token}/accept",
        headers=fourth.headers,
    )

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "member_limit_reached"
    assert response.json()["detail"]["limit"] == 3


def test_ai_apply_new_project_obeys_limit_without_partial_writes(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
) -> None:
    for index in range(5):
        assert create_project(client, workspace, f"Project {index}").status_code == 201
    project_count = database_session.scalar(select(func.count(Project.id)))
    task_count = database_session.scalar(select(func.count(Task.id)))

    response = client.post(
        "/api/v1/ai/project-plan/apply",
        headers=workspace.owner.headers,
        json=apply_payload(workspace.id),
    )

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "project_limit_reached"
    assert database_session.scalar(select(func.count(Project.id))) == project_count
    assert database_session.scalar(select(func.count(Task.id))) == task_count


def test_ai_apply_to_existing_project_does_not_consume_project_quota(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
) -> None:
    project_ids = []
    for index in range(5):
        created = create_project(client, workspace, f"Project {index}")
        assert created.status_code == 201
        project_ids.append(UUID(created.json()["id"]))

    response = client.post(
        "/api/v1/ai/project-plan/apply",
        headers=workspace.owner.headers,
        json=apply_payload(workspace.id, project_id=project_ids[0]),
    )

    assert response.status_code == 200
    assert response.json()["created_project"] is False
    assert response.json()["created_task_count"] == 2
    assert database_session.scalar(select(func.count(Project.id))) == 5
    assert database_session.scalar(select(func.count(Task.id))) == 2


def test_subscription_summary_is_member_readable_and_outsider_hidden(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    user_factory: UserFactory,
    workspace_member_factory: WorkspaceMemberFactory,
) -> None:
    workspace_member_factory.create(
        workspace,
        other_user,
        role=WorkspaceMemberRole.VIEWER,
    )
    outsider = user_factory.create()

    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/subscription",
        headers=other_user.headers,
    )
    hidden = client.get(
        f"/api/v1/workspaces/{workspace.id}/subscription",
        headers=outsider.headers,
    )

    assert response.status_code == 200
    assert response.json() == {
        "plan": "free",
        "status": "active",
        "current_period_start": None,
        "current_period_end": None,
        "cancel_at_period_end": False,
        "limits": {
            "members": 3,
            "projects": 5,
            "ai_requests_per_month": 25,
        },
        "usage": {
            "members": 2,
            "projects": 0,
            "ai_requests_this_month": 0,
        },
    }
    assert hidden.status_code == 404


def test_plan_derived_ai_quotas_reject_before_provider_call(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
) -> None:
    provider = MeteredProvider()
    app.dependency_overrides[get_ai_provider_dependency] = lambda: provider
    original_ceiling = settings.ai_monthly_request_limit
    settings.ai_monthly_request_limit = None
    now = datetime.now(timezone.utc)
    database_session.add_all(
        [
            AIUsageEvent(
                workspace_id=workspace.id,
                user_id=workspace.owner.id,
                operation_type="project_plan",
                provider="openai",
                model="test-model",
                status="success",
                created_at=now,
            )
            for _ in range(25)
        ]
    )
    database_session.commit()
    try:
        response = client.post(
            "/api/v1/ai/project-plan",
            headers=workspace.owner.headers,
            json={
                "workspace_id": str(workspace.id),
                "project_id": None,
                "prompt": "Create a detailed production launch project plan.",
                "target_date": None,
            },
        )
    finally:
        settings.ai_monthly_request_limit = original_ceiling
        app.dependency_overrides.pop(get_ai_provider_dependency, None)

    assert response.status_code == 429
    assert response.json()["detail"]["limit"] == 25
    assert provider.call_count == 0


def test_pro_ai_quota_is_returned_by_usage_endpoint(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
) -> None:
    promote_to_pro(workspace.id, database_session)

    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/ai/usage",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 200
    assert response.json()["request_limit"] == 500
    assert response.json()["requests_remaining"] == 500


def test_concurrent_free_workspace_creation_cannot_exceed_limit(
    client: TestClient,
    user: RegisteredUser,
    database_session: Session,
) -> None:
    def create(index: int) -> int:
        return client.post(
            "/api/v1/workspaces",
            headers=user.headers,
            json={"name": f"Concurrent {index}"},
        ).status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        statuses = list(executor.map(create, range(2)))

    assert sorted(statuses) == [201, 409]
    assert (
        database_session.scalar(
            select(func.count(Workspace.id)).where(Workspace.owner_id == user.id)
        )
        == 1
    )


def test_concurrent_legacy_project_creation_reuses_one_default_workspace(
    client: TestClient,
    user: RegisteredUser,
    database_session: Session,
) -> None:
    def create(index: int) -> int:
        return client.post(
            "/api/v1/projects",
            headers=user.headers,
            json={"name": f"Concurrent project {index}"},
        ).status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        statuses = list(executor.map(create, range(2)))

    assert statuses == [201, 201]
    assert (
        database_session.scalar(
            select(func.count(Workspace.id)).where(Workspace.owner_id == user.id)
        )
        == 1
    )
    assert database_session.scalar(select(func.count(Project.id))) == 2


def test_concurrent_project_creation_cannot_exceed_limit(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
) -> None:
    database_session.add_all(
        [
            Project(name=f"Existing {index}", workspace_id=workspace.id)
            for index in range(4)
        ]
    )
    database_session.commit()

    def create(index: int) -> int:
        return create_project(client, workspace, f"Concurrent {index}").status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        statuses = list(executor.map(create, range(2)))

    assert sorted(statuses) == [201, 409]
    assert (
        database_session.scalar(
            select(func.count(Project.id)).where(
                Project.workspace_id == workspace.id,
                Project.deleted_at.is_(None),
            )
        )
        == 5
    )


def test_concurrent_invitation_acceptance_cannot_exceed_member_limit(
    client: TestClient,
    workspace: CreatedWorkspace,
    user_factory: UserFactory,
    workspace_member_factory: WorkspaceMemberFactory,
    workspace_invitation_factory: WorkspaceInvitationFactory,
    database_session: Session,
) -> None:
    existing_member = user_factory.create()
    first_invitee = user_factory.create()
    second_invitee = user_factory.create()
    workspace_member_factory.create(workspace, existing_member)
    invitations = [
        workspace_invitation_factory.create(workspace, first_invitee),
        workspace_invitation_factory.create(workspace, second_invitee),
    ]

    def accept(index: int) -> int:
        invited_user = (first_invitee, second_invitee)[index]
        return client.post(
            f"/api/v1/invitations/{invitations[index].token}/accept",
            headers=invited_user.headers,
        ).status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        statuses = list(executor.map(accept, range(2)))

    assert sorted(statuses) == [200, 409]
    database_session.expire_all()
    summary = client.get(
        f"/api/v1/workspaces/{workspace.id}/subscription",
        headers=workspace.owner.headers,
    )
    assert summary.status_code == 200
    assert summary.json()["usage"]["members"] == 3
