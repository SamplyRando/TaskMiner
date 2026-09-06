from datetime import datetime, timedelta, timezone
from collections.abc import Generator
from typing import Literal
from uuid import UUID

from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import SecretStr
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_billing_provider_dependency
from app.billing.provider import (
    BillingEvent,
    BillingPortalRequest,
    BillingRedirect,
    BillingSignatureError,
    CheckoutSessionRequest,
)
from app.billing.service import BillingService
from app.core.config import settings
from app.main import app
from app.models.project import Project
from app.models.stripe_webhook_event import StripeWebhookEvent
from app.models.workspace_member import WorkspaceMemberRole
from app.models.workspace_subscription import WorkspaceSubscription
from app.repositories.billing import BillingRepository
from app.repositories.workspace import WorkspaceRepository
from app.repositories.workspace_member import WorkspaceMemberRepository
from app.services.permission import PermissionService
from app.subscriptions.plans import PlanCode, SubscriptionSource, SubscriptionStatus
from tests.factories import (
    CreatedWorkspace,
    RegisteredUser,
    UserFactory,
    WorkspaceFactory,
    WorkspaceMemberFactory,
)


class StubBillingProvider:
    provider_name: Literal["stripe"] = "stripe"

    def __init__(self) -> None:
        self.checkout_requests: list[CheckoutSessionRequest] = []
        self.portal_requests: list[BillingPortalRequest] = []
        self.event: BillingEvent | None = None

    def create_checkout_session(
        self,
        request: CheckoutSessionRequest,
    ) -> BillingRedirect:
        self.checkout_requests.append(request)
        return BillingRedirect("https://checkout.stripe.com/c/pay/test")

    def create_portal_session(
        self,
        request: BillingPortalRequest,
    ) -> BillingRedirect:
        self.portal_requests.append(request)
        return BillingRedirect("https://billing.stripe.com/p/test")

    def parse_webhook(self, payload: bytes, signature: str | None) -> BillingEvent:
        del payload, signature
        if self.event is None:
            raise BillingSignatureError("Invalid signature")
        return self.event


def make_event(
    workspace_id: UUID,
    *,
    event_id: str = "evt_test",
    event_type: str = "customer.subscription.updated",
    created_at: datetime | None = None,
    customer_id: str | None = "cus_test",
    subscription_id: str | None = "sub_test",
    price_id: str | None = "price_test_pro",
    provider_status: str | None = "active",
    cancel_at_period_end: bool = False,
    cancel_at: datetime | None = None,
) -> BillingEvent:
    now = created_at or datetime.now(timezone.utc)
    return BillingEvent(
        event_id=event_id,
        event_type=event_type,
        created_at=now,
        workspace_id=workspace_id,
        customer_id=customer_id,
        subscription_id=subscription_id,
        price_id=price_id,
        provider_status=provider_status,
        payment_status="paid",
        current_period_start=now,
        current_period_end=now + timedelta(days=30),
        cancel_at_period_end=cancel_at_period_end,
        cancel_at=cancel_at,
    )


def override_billing(
    monkeypatch: pytest.MonkeyPatch,
    provider: StubBillingProvider,
) -> None:
    monkeypatch.setattr(settings, "stripe_pro_price_id", "price_test_pro")
    monkeypatch.setattr(settings, "stripe_secret_key", SecretStr("stripe-test"))
    monkeypatch.setattr(
        settings,
        "stripe_webhook_secret",
        SecretStr("stripe-webhook-test"),
    )
    app.dependency_overrides[get_billing_provider_dependency] = lambda: provider


@pytest.fixture(autouse=True)
def clear_billing_overrides() -> Generator[None, None, None]:
    yield
    app.dependency_overrides.pop(get_billing_provider_dependency, None)


def test_missing_billing_configuration_maps_to_stable_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.billing.provider import BillingConfigurationError

    def unavailable():
        raise BillingConfigurationError("secret provider configuration detail")

    monkeypatch.setattr("app.api.deps.get_billing_provider", unavailable)

    try:
        get_billing_provider_dependency()
    except HTTPException as error:
        assert error.status_code == 503
        assert error.detail == {
            "code": "billing_not_configured",
            "message": "Billing is not configured.",
        }
        assert "secret provider configuration detail" not in str(error.detail)
    else:
        raise AssertionError("Expected billing configuration error")


def test_unconfigured_checkout_endpoint_fails_without_breaking_application(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    response = client.post(
        f"/api/v1/workspaces/{workspace.id}/billing/checkout",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 503
    assert response.json()["detail"] == {
        "code": "billing_not_configured",
        "message": "Billing is not configured.",
    }


def test_owner_checkout_uses_server_price_and_reuses_customer(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = StubBillingProvider()
    override_billing(monkeypatch, provider)
    subscription = database_session.scalar(
        select(WorkspaceSubscription).where(
            WorkspaceSubscription.workspace_id == workspace.id
        )
    )
    assert subscription is not None
    subscription.stripe_customer_id = "cus_existing"
    database_session.commit()

    response = client.post(
        f"/api/v1/workspaces/{workspace.id}/billing/checkout",
        headers=workspace.owner.headers,
        json={"price_id": "price_attacker"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "checkout_url": "https://checkout.stripe.com/c/pay/test",
    }
    assert len(provider.checkout_requests) == 1
    request = provider.checkout_requests[0]
    assert request.price_id == "price_test_pro"
    assert request.customer_id == "cus_existing"
    assert request.workspace_id == workspace.id


def test_later_checkout_attempt_uses_a_new_server_attempt_id(
    client: TestClient,
    workspace: CreatedWorkspace,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = StubBillingProvider()
    override_billing(monkeypatch, provider)

    first = client.post(
        f"/api/v1/workspaces/{workspace.id}/billing/checkout",
        headers=workspace.owner.headers,
    )
    later = client.post(
        f"/api/v1/workspaces/{workspace.id}/billing/checkout",
        headers=workspace.owner.headers,
    )

    assert first.status_code == 200
    assert later.status_code == 200
    assert len(provider.checkout_requests) == 2
    assert (
        provider.checkout_requests[0].attempt_id
        != provider.checkout_requests[1].attempt_id
    )


def test_non_owner_and_outsider_cannot_start_checkout(
    client: TestClient,
    workspace: CreatedWorkspace,
    other_user: RegisteredUser,
    user_factory: UserFactory,
    workspace_member_factory: WorkspaceMemberFactory,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = StubBillingProvider()
    override_billing(monkeypatch, provider)
    workspace_member_factory.create(
        workspace,
        other_user,
        role=WorkspaceMemberRole.ADMIN,
    )
    outsider = user_factory.create()

    member_response = client.post(
        f"/api/v1/workspaces/{workspace.id}/billing/checkout",
        headers=other_user.headers,
    )
    outsider_response = client.post(
        f"/api/v1/workspaces/{workspace.id}/billing/checkout",
        headers=outsider.headers,
    )

    assert member_response.status_code == 403
    assert outsider_response.status_code == 404
    assert provider.checkout_requests == []


def test_deleted_workspace_cannot_start_checkout(
    client: TestClient,
    workspace: CreatedWorkspace,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = StubBillingProvider()
    override_billing(monkeypatch, provider)
    assert (
        client.delete(
            f"/api/v1/workspaces/{workspace.id}",
            headers=workspace.owner.headers,
        ).status_code
        == 204
    )

    response = client.post(
        f"/api/v1/workspaces/{workspace.id}/billing/checkout",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 404
    assert provider.checkout_requests == []


def test_portal_is_only_available_for_owner_with_stripe_customer(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = StubBillingProvider()
    override_billing(monkeypatch, provider)
    subscription = database_session.scalar(
        select(WorkspaceSubscription).where(
            WorkspaceSubscription.workspace_id == workspace.id
        )
    )
    assert subscription is not None
    subscription.plan_code = PlanCode.PRO
    subscription.status = SubscriptionStatus.ACTIVE
    subscription.source = SubscriptionSource.STRIPE
    subscription.stripe_customer_id = "cus_existing"
    database_session.commit()

    response = client.post(
        f"/api/v1/workspaces/{workspace.id}/billing/portal",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 200
    assert response.json()["portal_url"] == "https://billing.stripe.com/p/test"
    assert provider.portal_requests == [
        BillingPortalRequest(
            customer_id="cus_existing",
            return_url="http://localhost:3000/app/workspaces",
        )
    ]
    summary = client.get(
        f"/api/v1/workspaces/{workspace.id}/subscription",
        headers=workspace.owner.headers,
    )
    assert summary.status_code == 200
    assert summary.json()["billing_portal_available"] is True


@pytest.mark.parametrize(
    "subscription_status",
    [SubscriptionStatus.ACTIVE, SubscriptionStatus.INACTIVE],
)
def test_only_free_workspace_can_start_checkout(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
    monkeypatch: pytest.MonkeyPatch,
    subscription_status: SubscriptionStatus,
) -> None:
    provider = StubBillingProvider()
    override_billing(monkeypatch, provider)
    subscription = database_session.scalar(
        select(WorkspaceSubscription).where(
            WorkspaceSubscription.workspace_id == workspace.id
        )
    )
    assert subscription is not None
    subscription.plan_code = PlanCode.PRO
    subscription.status = subscription_status
    database_session.commit()

    response = client.post(
        f"/api/v1/workspaces/{workspace.id}/billing/checkout",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "billing_state_conflict"
    assert provider.checkout_requests == []


def test_workspace_with_stripe_subscription_cannot_start_second_checkout(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = StubBillingProvider()
    override_billing(monkeypatch, provider)
    subscription = database_session.scalar(
        select(WorkspaceSubscription).where(
            WorkspaceSubscription.workspace_id == workspace.id
        )
    )
    assert subscription is not None
    subscription.stripe_subscription_id = "sub_existing"
    database_session.commit()

    response = client.post(
        f"/api/v1/workspaces/{workspace.id}/billing/checkout",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "billing_state_conflict"
    assert provider.checkout_requests == []


def test_webhook_promotes_once_and_downgrades_without_deleting_data(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = StubBillingProvider()
    override_billing(monkeypatch, provider)
    provider.event = make_event(workspace.id, event_id="evt_upgrade")

    promoted = client.post(
        "/api/v1/billing/stripe/webhook",
        content=b"signed-payload",
        headers={"Stripe-Signature": "signed"},
    )
    replay = client.post(
        "/api/v1/billing/stripe/webhook",
        content=b"signed-payload",
        headers={"Stripe-Signature": "signed"},
    )

    assert promoted.status_code == 200
    assert promoted.json() == {
        "received": True,
        "duplicate": False,
        "handled": True,
    }
    assert replay.json()["duplicate"] is True
    database_session.expire_all()
    subscription = database_session.scalar(
        select(WorkspaceSubscription).where(
            WorkspaceSubscription.workspace_id == workspace.id
        )
    )
    assert subscription is not None
    assert subscription.plan_code == PlanCode.PRO
    assert subscription.status == SubscriptionStatus.ACTIVE
    assert subscription.stripe_subscription_id == "sub_test"
    assert database_session.scalar(select(func.count(StripeWebhookEvent.id))) == 1

    database_session.add_all(
        [
            Project(name=f"Existing {index}", workspace_id=workspace.id)
            for index in range(6)
        ]
    )
    database_session.commit()
    provider.event = make_event(
        workspace.id,
        event_id="evt_deleted",
        event_type="customer.subscription.deleted",
        created_at=datetime.now(timezone.utc) + timedelta(seconds=1),
        provider_status="canceled",
        cancel_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    downgraded = client.post(
        "/api/v1/billing/stripe/webhook",
        content=b"signed-payload",
        headers={"Stripe-Signature": "signed"},
    )

    assert downgraded.status_code == 200
    database_session.expire_all()
    assert database_session.scalar(select(func.count(Project.id))) == 6
    subscription = database_session.scalar(
        select(WorkspaceSubscription).where(
            WorkspaceSubscription.workspace_id == workspace.id
        )
    )
    assert subscription is not None
    assert subscription.plan_code == PlanCode.FREE
    assert subscription.status == SubscriptionStatus.CANCELED
    assert subscription.cancel_at is None
    blocked = client.post(
        f"/api/v1/projects?workspace_id={workspace.id}",
        headers=workspace.owner.headers,
        json={"name": "Blocked after downgrade"},
    )
    assert blocked.status_code == 409
    assert blocked.json()["detail"]["code"] == "project_limit_reached"


def test_checkout_completion_links_identity_without_granting_pro(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = StubBillingProvider()
    override_billing(monkeypatch, provider)
    provider.event = make_event(
        workspace.id,
        event_id="evt_checkout",
        event_type="checkout.session.completed",
        provider_status="complete",
    )

    response = client.post(
        "/api/v1/billing/stripe/webhook",
        content=b"signed-payload",
        headers={"Stripe-Signature": "signed"},
    )

    assert response.status_code == 200
    database_session.expire_all()
    subscription = database_session.scalar(
        select(WorkspaceSubscription).where(
            WorkspaceSubscription.workspace_id == workspace.id
        )
    )
    assert subscription is not None
    assert subscription.plan_code == PlanCode.FREE
    assert subscription.stripe_customer_id == "cus_test"
    assert subscription.stripe_subscription_id == "sub_test"


@pytest.mark.parametrize("cancel_at_period_end", [False, True])
def test_subscription_updates_persist_and_reverse_scheduled_cancellation(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
    monkeypatch: pytest.MonkeyPatch,
    cancel_at_period_end: bool,
) -> None:
    provider = StubBillingProvider()
    override_billing(monkeypatch, provider)
    now = datetime.now(timezone.utc)
    cancellation_at = now + timedelta(days=30)
    provider.event = make_event(
        workspace.id,
        event_id="evt_cancel_scheduled",
        created_at=now,
        cancel_at_period_end=cancel_at_period_end,
        cancel_at=cancellation_at,
    )

    scheduled = client.post(
        "/api/v1/billing/stripe/webhook",
        content=b"signed-payload",
        headers={"Stripe-Signature": "signed"},
    )

    assert scheduled.status_code == 200
    database_session.expire_all()
    subscription = database_session.scalar(
        select(WorkspaceSubscription).where(
            WorkspaceSubscription.workspace_id == workspace.id
        )
    )
    assert subscription is not None
    assert subscription.plan_code == PlanCode.PRO
    assert subscription.status == SubscriptionStatus.ACTIVE
    assert subscription.cancel_at_period_end is cancel_at_period_end
    assert subscription.cancel_at == cancellation_at
    assert subscription.current_period_end is not None
    summary = client.get(
        f"/api/v1/workspaces/{workspace.id}/subscription",
        headers=workspace.owner.headers,
    )
    assert summary.status_code == 200
    assert summary.json()["cancel_at_period_end"] is cancel_at_period_end
    assert summary.json()["current_period_end"] is not None
    assert (
        datetime.fromisoformat(summary.json()["scheduled_cancellation_at"])
        == cancellation_at
    )

    provider.event = make_event(
        workspace.id,
        event_id="evt_cancel_reversed",
        created_at=now + timedelta(seconds=1),
        cancel_at_period_end=False,
    )
    resumed = client.post(
        "/api/v1/billing/stripe/webhook",
        content=b"signed-payload",
        headers={"Stripe-Signature": "signed"},
    )

    assert resumed.status_code == 200
    database_session.expire_all()
    subscription = database_session.scalar(
        select(WorkspaceSubscription).where(
            WorkspaceSubscription.workspace_id == workspace.id
        )
    )
    assert subscription is not None
    assert subscription.plan_code == PlanCode.PRO
    assert subscription.status == SubscriptionStatus.ACTIVE
    assert subscription.cancel_at_period_end is False
    assert subscription.cancel_at is None
    summary = client.get(
        f"/api/v1/workspaces/{workspace.id}/subscription",
        headers=workspace.owner.headers,
    )
    assert summary.status_code == 200
    assert summary.json()["cancel_at_period_end"] is False
    assert summary.json()["scheduled_cancellation_at"] is None


def test_period_end_flag_without_cancel_at_uses_current_period_end(
    client: TestClient,
    workspace: CreatedWorkspace,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = StubBillingProvider()
    override_billing(monkeypatch, provider)
    provider.event = make_event(
        workspace.id,
        event_id="evt_period_end_fallback",
        cancel_at_period_end=True,
        cancel_at=None,
    )

    response = client.post(
        "/api/v1/billing/stripe/webhook",
        content=b"signed-payload",
        headers={"Stripe-Signature": "signed"},
    )
    summary = client.get(
        f"/api/v1/workspaces/{workspace.id}/subscription",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 200
    assert summary.status_code == 200
    assert (
        summary.json()["scheduled_cancellation_at"]
        == summary.json()["current_period_end"]
    )


def test_wrong_stripe_price_cannot_grant_pro(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = StubBillingProvider()
    override_billing(monkeypatch, provider)
    provider.event = make_event(
        workspace.id,
        event_id="evt_wrong_price",
        price_id="price_not_taskminer_pro",
    )

    response = client.post(
        "/api/v1/billing/stripe/webhook",
        content=b"signed-payload",
        headers={"Stripe-Signature": "signed"},
    )

    assert response.status_code == 200
    assert response.json()["handled"] is False
    database_session.expire_all()
    subscription = database_session.scalar(
        select(WorkspaceSubscription).where(
            WorkspaceSubscription.workspace_id == workspace.id
        )
    )
    assert subscription is not None
    assert subscription.plan_code == PlanCode.FREE
    assert subscription.stripe_subscription_id is None


def test_failed_invoice_normalizes_subscription_to_past_due(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = StubBillingProvider()
    override_billing(monkeypatch, provider)
    subscription = database_session.scalar(
        select(WorkspaceSubscription).where(
            WorkspaceSubscription.workspace_id == workspace.id
        )
    )
    assert subscription is not None
    subscription.plan_code = PlanCode.PRO
    subscription.status = SubscriptionStatus.ACTIVE
    subscription.source = SubscriptionSource.STRIPE
    subscription.stripe_customer_id = "cus_test"
    subscription.stripe_subscription_id = "sub_test"
    database_session.commit()
    provider.event = make_event(
        workspace.id,
        event_id="evt_payment_failed",
        event_type="invoice.payment_failed",
        provider_status="open",
        price_id=None,
    )

    response = client.post(
        "/api/v1/billing/stripe/webhook",
        content=b"signed-payload",
        headers={"Stripe-Signature": "signed"},
    )

    assert response.status_code == 200
    database_session.expire_all()
    subscription = database_session.scalar(
        select(WorkspaceSubscription).where(
            WorkspaceSubscription.workspace_id == workspace.id
        )
    )
    assert subscription is not None
    assert subscription.plan_code == PlanCode.PRO
    assert subscription.status == SubscriptionStatus.PAST_DUE


def test_signed_event_cannot_cross_workspace_identity(
    client: TestClient,
    workspace: CreatedWorkspace,
    user_factory: UserFactory,
    workspace_factory: WorkspaceFactory,
    database_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = StubBillingProvider()
    override_billing(monkeypatch, provider)
    other_workspace = workspace_factory.create(user_factory.create())
    subscription = database_session.scalar(
        select(WorkspaceSubscription).where(
            WorkspaceSubscription.workspace_id == workspace.id
        )
    )
    assert subscription is not None
    subscription.stripe_customer_id = "cus_test"
    subscription.stripe_subscription_id = "sub_test"
    database_session.commit()
    provider.event = make_event(
        other_workspace.id,
        event_id="evt_cross_workspace",
    )

    response = client.post(
        "/api/v1/billing/stripe/webhook",
        content=b"signed-payload",
        headers={"Stripe-Signature": "signed"},
    )

    assert response.status_code == 409
    database_session.expire_all()
    target = database_session.scalar(
        select(WorkspaceSubscription).where(
            WorkspaceSubscription.workspace_id == workspace.id
        )
    )
    other = database_session.scalar(
        select(WorkspaceSubscription).where(
            WorkspaceSubscription.workspace_id == other_workspace.id
        )
    )
    assert target is not None and target.plan_code == PlanCode.FREE
    assert other is not None and other.plan_code == PlanCode.FREE
    assert database_session.scalar(select(func.count(StripeWebhookEvent.id))) == 0


def test_invalid_signature_is_rejected_without_authentication(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = StubBillingProvider()
    override_billing(monkeypatch, provider)

    response = client.post(
        "/api/v1/billing/stripe/webhook",
        content=b"invalid",
        headers={"Stripe-Signature": "invalid"},
    )

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "invalid_webhook_signature"


def test_subscription_summary_exposes_safe_billing_availability(
    client: TestClient,
    workspace: CreatedWorkspace,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = StubBillingProvider()
    override_billing(monkeypatch, provider)

    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/subscription",
        headers=workspace.owner.headers,
    )

    assert response.status_code == 200
    assert response.json()["billing_enabled"] is True
    assert response.json()["billing_portal_available"] is False
    assert "stripe_customer_id" not in response.json()
    assert "stripe_subscription_id" not in response.json()


def test_old_subscription_event_cannot_overwrite_newer_state(
    database_session: Session,
    workspace: CreatedWorkspace,
) -> None:
    provider = StubBillingProvider()
    repository = BillingRepository(database_session)
    service = BillingService(
        repository,
        PermissionService(
            WorkspaceMemberRepository(database_session),
            WorkspaceRepository(database_session),
        ),
        provider,
        pro_price_id="price_test_pro",
        success_url="https://www.taskminer.app/app/workspaces?billing=success",
        cancel_url="https://www.taskminer.app/app/workspaces?billing=cancelled",
    )
    now = datetime.now(timezone.utc)
    service.handle_webhook(
        make_event(
            workspace.id,
            event_id="evt_newer",
            created_at=now,
            provider_status="active",
        )
    )
    service.handle_webhook(
        make_event(
            workspace.id,
            event_id="evt_older",
            event_type="customer.subscription.deleted",
            created_at=now - timedelta(minutes=1),
            provider_status="canceled",
        )
    )

    database_session.expire_all()
    subscription = database_session.scalar(
        select(WorkspaceSubscription).where(
            WorkspaceSubscription.workspace_id == workspace.id
        )
    )
    assert subscription is not None
    assert subscription.plan_code == PlanCode.PRO
    assert subscription.status == SubscriptionStatus.ACTIVE
