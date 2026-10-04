from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.ai_usage_event import AIUsageEvent
from app.models.audit_log import AuditLog
from app.models.workspace import Workspace
from app.models.workspace_subscription import WorkspaceSubscription
from tests.factories import CreatedWorkspace, ProjectFactory, RegisteredUser


def test_owner_restores_same_workspace_and_children_with_billing_untouched(
    client: TestClient,
    workspace: CreatedWorkspace,
    project_factory: ProjectFactory,
    database_session: Session,
) -> None:
    project = project_factory.create(workspace.owner, name="Recover me")
    subscription = database_session.scalar(
        select(WorkspaceSubscription).where(
            WorkspaceSubscription.workspace_id == workspace.id
        )
    )
    assert subscription is not None
    subscription_id = subscription.id
    database_session.commit()

    assert (
        client.delete(
            f"/api/v1/workspaces/{workspace.id}", headers=workspace.owner.headers
        ).status_code
        == 204
    )
    recoverable = client.get(
        "/api/v1/workspaces/recoverable", headers=workspace.owner.headers
    )
    assert recoverable.status_code == 200
    assert [item["id"] for item in recoverable.json()] == [str(workspace.id)]

    restored = client.post(
        f"/api/v1/workspaces/{workspace.id}/restore",
        headers=workspace.owner.headers,
    )
    assert restored.status_code == 200
    assert restored.json()["id"] == str(workspace.id)
    assert (
        client.get(
            f"/api/v1/projects/{project.id}", headers=workspace.owner.headers
        ).status_code
        == 200
    )
    database_session.expire_all()
    stored_subscription = database_session.get(WorkspaceSubscription, subscription_id)
    assert stored_subscription is not None
    assert stored_subscription.workspace_id == workspace.id
    assert stored_subscription.stripe_subscription_id is None
    activity = database_session.scalar(
        select(Activity).where(
            Activity.resource_id == workspace.id,
            Activity.activity_metadata["source"].astext == "workspace_restore",
        )
    )
    audit = database_session.scalar(
        select(AuditLog).where(
            AuditLog.resource_id == workspace.id,
            AuditLog.audit_metadata["source"].astext == "workspace_restore",
        )
    )
    assert activity is not None
    assert activity.activity_metadata["source"] == "workspace_restore"
    assert audit is not None
    assert audit.audit_metadata["source"] == "workspace_restore"


def test_non_owner_cannot_list_or_restore_another_users_workspace(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
) -> None:
    assert (
        client.delete(
            f"/api/v1/workspaces/{workspace.id}", headers=workspace.owner.headers
        ).status_code
        == 204
    )
    assert (
        client.get("/api/v1/workspaces/recoverable", headers=other_user.headers).json()
        == []
    )
    response = client.post(
        f"/api/v1/workspaces/{workspace.id}/restore",
        headers=other_user.headers,
    )
    assert response.status_code == 404


def test_workspace_recovery_expires_after_30_days(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
) -> None:
    stored = database_session.get(Workspace, workspace.id)
    assert stored is not None
    stored.deleted_at = datetime.now(timezone.utc) - timedelta(days=31)
    database_session.commit()

    assert (
        client.get(
            "/api/v1/workspaces/recoverable", headers=workspace.owner.headers
        ).json()
        == []
    )
    response = client.post(
        f"/api/v1/workspaces/{workspace.id}/restore",
        headers=workspace.owner.headers,
    )
    assert response.status_code == 410


def test_restore_respects_workspace_limit_and_preserves_free_ai_usage(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
) -> None:
    usage = AIUsageEvent(
        workspace_id=workspace.id,
        user_id=workspace.owner.id,
        free_quota_owner_id=workspace.owner.id,
        operation_type="project_plan",
        provider="openai",
        model="test-model",
        status="success",
    )
    database_session.add(usage)
    database_session.commit()
    usage_id = usage.id

    assert (
        client.delete(
            f"/api/v1/workspaces/{workspace.id}", headers=workspace.owner.headers
        ).status_code
        == 204
    )
    replacement = client.post(
        "/api/v1/workspaces",
        headers=workspace.owner.headers,
        json={"name": "Replacement"},
    )
    assert replacement.status_code == 201
    blocked = client.post(
        f"/api/v1/workspaces/{workspace.id}/restore",
        headers=workspace.owner.headers,
    )
    assert blocked.status_code == 409
    assert blocked.json()["detail"]["code"] == "workspace_limit_reached"
    replacement_summary = client.get(
        f"/api/v1/workspaces/{replacement.json()['id']}/subscription",
        headers=workspace.owner.headers,
    )
    assert replacement_summary.status_code == 200
    assert replacement_summary.json()["usage"]["ai_requests_this_month"] == 1

    assert (
        client.delete(
            f"/api/v1/workspaces/{replacement.json()['id']}",
            headers=workspace.owner.headers,
        ).status_code
        == 204
    )
    restored = client.post(
        f"/api/v1/workspaces/{workspace.id}/restore",
        headers=workspace.owner.headers,
    )
    assert restored.status_code == 200
    database_session.expire_all()
    stored_usage = database_session.get(AIUsageEvent, usage_id)
    assert stored_usage is not None
    assert stored_usage.workspace_id == workspace.id
    assert stored_usage.free_quota_owner_id == workspace.owner.id
    summary = client.get(
        f"/api/v1/workspaces/{workspace.id}/subscription",
        headers=workspace.owner.headers,
    )
    assert summary.status_code == 200
    assert summary.json()["usage"]["ai_requests_this_month"] == 1
