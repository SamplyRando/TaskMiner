from datetime import datetime, timezone
import hashlib
import hmac
import json
import time
from typing import Any
from uuid import uuid4

import pytest
import stripe

from app.billing.factory import build_billing_provider
from app.billing.provider import (
    BillingConfigurationError,
    BillingPortalRequest,
    BillingProviderError,
    BillingSignatureError,
    CheckoutSessionRequest,
)
from app.billing.stripe_provider import StripeBillingProvider
from app.core.config import Settings


def build_settings(**overrides: object) -> Settings:
    values: dict[str, Any] = {
        "DATABASE_URL": "postgresql://user:password@host/database",
        "SECRET_KEY": "billing-test-secret-key-at-least-32-characters",
        "ACCESS_TOKEN_EXPIRE_MINUTES": 30,
        "ALGORITHM": "HS256",
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)  # type: ignore[call-arg]


def configured_provider() -> StripeBillingProvider:
    provider = build_billing_provider(
        build_settings(
            STRIPE_SECRET_KEY="stripe-test-secret",
            STRIPE_WEBHOOK_SECRET="stripe-test-webhook-secret",
            STRIPE_PRO_PRICE_ID="price_test_pro",
        )
    )
    assert isinstance(provider, StripeBillingProvider)
    return provider


def test_billing_is_disabled_without_server_credentials() -> None:
    settings = build_settings()

    assert settings.billing_enabled is False
    with pytest.raises(
        BillingConfigurationError,
        match="Stripe billing is not configured",
    ):
        build_billing_provider(settings)


def test_billing_requires_all_three_server_values() -> None:
    settings = build_settings(
        STRIPE_SECRET_KEY="stripe-test-secret",
        STRIPE_PRO_PRICE_ID="price_test_pro",
    )

    assert settings.billing_enabled is False


def test_checkout_uses_backend_price_workspace_metadata_and_known_customer(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = configured_provider()
    captured: dict[str, object] = {}

    def create(params: object, options: object) -> object:
        captured["params"] = params
        captured["options"] = options
        return stripe.checkout.Session.construct_from(
            {"id": "cs_test_safe", "url": "https://checkout.stripe.com/c/pay/test"},
            "stripe-test-secret",
        )

    monkeypatch.setattr(provider._client.v1.checkout.sessions, "create", create)
    workspace_id = uuid4()

    result = provider.create_checkout_session(
        CheckoutSessionRequest(
            workspace_id=workspace_id,
            customer_email="owner@example.com",
            customer_id="cus_existing",
            price_id="price_test_pro",
            success_url="https://www.taskminer.app/app/workspaces?billing=success",
            cancel_url="https://www.taskminer.app/app/workspaces?billing=cancelled",
        )
    )

    params = captured["params"]
    assert isinstance(params, dict)
    assert params["line_items"] == [{"price": "price_test_pro", "quantity": 1}]
    assert params["customer"] == "cus_existing"
    assert "customer_email" not in params
    assert params["metadata"] == {"workspace_id": str(workspace_id)}
    assert params["subscription_data"] == {
        "metadata": {"workspace_id": str(workspace_id)}
    }
    assert captured["options"] == {
        "idempotency_key": f"taskminer-pro-checkout-{workspace_id}"
    }
    assert result.url.startswith("https://checkout.stripe.com/")


def test_checkout_uses_owner_email_until_customer_is_known(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = configured_provider()
    captured: dict[str, object] = {}

    def create(params: object, options: object) -> object:
        captured["params"] = params
        captured["options"] = options
        return stripe.checkout.Session.construct_from(
            {"id": "cs_test_safe", "url": "https://checkout.stripe.com/test"},
            "stripe-test-secret",
        )

    monkeypatch.setattr(provider._client.v1.checkout.sessions, "create", create)
    provider.create_checkout_session(
        CheckoutSessionRequest(
            workspace_id=uuid4(),
            customer_email="owner@example.com",
            customer_id=None,
            price_id="price_test_pro",
            success_url="https://www.taskminer.app/app/workspaces?billing=success",
            cancel_url="https://www.taskminer.app/app/workspaces?billing=cancelled",
        )
    )

    params = captured["params"]
    assert isinstance(params, dict)
    assert params["customer_email"] == "owner@example.com"
    assert "customer" not in params


def test_portal_uses_customer_and_safe_return_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = configured_provider()
    captured: dict[str, object] = {}

    def create(params: object) -> object:
        captured["params"] = params
        return stripe.billing_portal.Session.construct_from(
            {"id": "bps_test", "url": "https://billing.stripe.com/p/test"},
            "stripe-test-secret",
        )

    monkeypatch.setattr(provider._client.v1.billing_portal.sessions, "create", create)

    result = provider.create_portal_session(
        BillingPortalRequest(
            customer_id="cus_existing",
            return_url="https://www.taskminer.app/app/workspaces",
        )
    )

    assert captured["params"] == {
        "customer": "cus_existing",
        "return_url": "https://www.taskminer.app/app/workspaces",
    }
    assert result.url == "https://billing.stripe.com/p/test"


def test_provider_hides_stripe_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    provider = configured_provider()

    def fail(params: object, options: object) -> object:
        del params, options
        raise stripe.APIConnectionError("sensitive-upstream-detail")

    monkeypatch.setattr(provider._client.v1.checkout.sessions, "create", fail)

    with pytest.raises(
        BillingProviderError,
        match="billing provider is temporarily unavailable",
    ) as error:
        provider.create_checkout_session(
            CheckoutSessionRequest(
                workspace_id=uuid4(),
                customer_email="owner@example.com",
                customer_id=None,
                price_id="price_test_pro",
                success_url="https://www.taskminer.app/app/workspaces?billing=success",
                cancel_url="https://www.taskminer.app/app/workspaces?billing=cancelled",
            )
        )

    assert "sensitive-upstream-detail" not in str(error.value)


def test_real_signature_verification_and_event_normalization() -> None:
    webhook_secret = "stripe-test-webhook-secret"
    provider = StripeBillingProvider("stripe-test-secret", webhook_secret)
    workspace_id = uuid4()
    timestamp = int(time.time())
    payload = json.dumps(
        {
            "id": "evt_test_subscription",
            "type": "customer.subscription.updated",
            "created": timestamp,
            "data": {
                "object": {
                    "id": "sub_test",
                    "customer": "cus_test",
                    "status": "active",
                    "metadata": {"workspace_id": str(workspace_id)},
                    "cancel_at_period_end": False,
                    "cancel_at": timestamp + 3600,
                    "current_period_start": timestamp - 60,
                    "current_period_end": timestamp + 3600,
                    "items": {"data": [{"price": {"id": "price_test_pro"}}]},
                }
            },
        },
        separators=(",", ":"),
    ).encode()
    signature = hmac.new(
        webhook_secret.encode(),
        f"{timestamp}.{payload.decode()}".encode(),
        hashlib.sha256,
    ).hexdigest()

    event = provider.parse_webhook(payload, f"t={timestamp},v1={signature}")

    assert event.event_id == "evt_test_subscription"
    assert event.workspace_id == workspace_id
    assert event.customer_id == "cus_test"
    assert event.subscription_id == "sub_test"
    assert event.price_id == "price_test_pro"
    assert event.provider_status == "active"
    assert event.cancel_at_period_end is False
    assert event.cancel_at == datetime.fromtimestamp(
        timestamp + 3600,
        tz=timezone.utc,
    )
    assert event.created_at == datetime.fromtimestamp(timestamp, tz=timezone.utc)


def test_invalid_webhook_signature_is_rejected() -> None:
    provider = configured_provider()

    with pytest.raises(BillingSignatureError):
        provider.parse_webhook(b"{}", "t=1,v1=invalid")
