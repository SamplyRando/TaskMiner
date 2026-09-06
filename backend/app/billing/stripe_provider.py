from collections.abc import Callable, Mapping
from datetime import datetime, timezone
from typing import Literal, cast
from urllib.parse import urlparse
from uuid import UUID

import stripe

from app.billing.provider import (
    BillingEvent,
    BillingPortalRequest,
    BillingProviderError,
    BillingRedirect,
    BillingSignatureError,
    CheckoutSessionRequest,
)


class StripeBillingProvider:
    """Stripe SDK adapter that returns only TaskMiner billing primitives."""

    provider_name: Literal["stripe"] = "stripe"

    def __init__(
        self,
        secret_key: str,
        webhook_secret: str,
        *,
        client: stripe.StripeClient | None = None,
    ) -> None:
        self._webhook_secret = webhook_secret
        self._client = client or stripe.StripeClient(secret_key)

    def create_checkout_session(
        self,
        request: CheckoutSessionRequest,
    ) -> BillingRedirect:
        metadata = {"workspace_id": str(request.workspace_id)}
        params: stripe.params.checkout.SessionCreateParams = {
            "cancel_url": request.cancel_url,
            "client_reference_id": str(request.workspace_id),
            "line_items": [{"price": request.price_id, "quantity": 1}],
            "metadata": metadata,
            "mode": "subscription",
            "success_url": request.success_url,
            "subscription_data": {"metadata": metadata},
        }
        if request.customer_id is not None:
            params["customer"] = request.customer_id
        else:
            params["customer_email"] = request.customer_email

        try:
            session = self._client.v1.checkout.sessions.create(
                params,
                options={
                    "idempotency_key": f"taskminer-pro-checkout-{request.workspace_id}"
                },
            )
        except stripe.StripeError as exc:
            raise BillingProviderError(
                "The billing provider is temporarily unavailable."
            ) from exc

        return BillingRedirect(url=_provider_redirect_url(session.url))

    def create_portal_session(
        self,
        request: BillingPortalRequest,
    ) -> BillingRedirect:
        params: stripe.params.billing_portal.SessionCreateParams = {
            "customer": request.customer_id,
            "return_url": request.return_url,
        }
        try:
            session = self._client.v1.billing_portal.sessions.create(params)
        except stripe.StripeError as exc:
            raise BillingProviderError(
                "The billing provider is temporarily unavailable."
            ) from exc

        return BillingRedirect(url=_provider_redirect_url(session.url))

    def parse_webhook(self, payload: bytes, signature: str | None) -> BillingEvent:
        try:
            event = stripe.Webhook.construct_event(
                payload,
                signature,
                self._webhook_secret,
            )
        except (ValueError, stripe.SignatureVerificationError) as exc:
            raise BillingSignatureError("Invalid Stripe webhook signature.") from exc

        raw = cast(Mapping[str, object], event.to_dict())
        return _normalize_event(raw)


def _provider_redirect_url(value: str | None) -> str:
    if value is None:
        raise BillingProviderError("The billing provider returned no redirect URL.")
    parsed = urlparse(value)
    if parsed.scheme != "https" or not (
        parsed.hostname == "stripe.com"
        or (parsed.hostname is not None and parsed.hostname.endswith(".stripe.com"))
    ):
        raise BillingProviderError(
            "The billing provider returned an unsafe redirect URL."
        )
    return value


def _normalize_event(raw: Mapping[str, object]) -> BillingEvent:
    event_id = _required_string(raw.get("id"))
    event_type = _required_string(raw.get("type"))
    created_at = _timestamp(raw.get("created"))
    if created_at is None:
        raise BillingSignatureError("Invalid Stripe webhook payload.")

    data = _mapping(raw.get("data"))
    obj = _mapping(data.get("object"))
    metadata = _mapping(obj.get("metadata"))
    workspace_id = _workspace_id(metadata.get("workspace_id"))

    event_customer = _identifier(obj.get("customer"))
    event_subscription = _identifier(obj.get("subscription"))
    provider_status = _optional_string(obj.get("status"))
    payment_status = _optional_string(obj.get("payment_status"))

    if event_type.startswith("customer.subscription."):
        event_subscription = _identifier(obj.get("id"))
    elif event_type == "invoice.payment_failed":
        event_subscription = event_subscription or _invoice_subscription_id(obj)

    return BillingEvent(
        event_id=event_id,
        event_type=event_type,
        created_at=created_at,
        workspace_id=workspace_id,
        customer_id=event_customer,
        subscription_id=event_subscription,
        price_id=_price_id(obj),
        provider_status=provider_status,
        payment_status=payment_status,
        current_period_start=_period_timestamp(obj, "current_period_start", min),
        current_period_end=_period_timestamp(obj, "current_period_end", max),
        cancel_at_period_end=obj.get("cancel_at_period_end") is True,
        cancel_at=_timestamp(obj.get("cancel_at")),
    )


def _mapping(value: object) -> Mapping[str, object]:
    return value if isinstance(value, Mapping) else {}


def _required_string(value: object) -> str:
    result = _optional_string(value)
    if result is None:
        raise BillingSignatureError("Invalid Stripe webhook payload.")
    return result


def _optional_string(value: object) -> str | None:
    return value if isinstance(value, str) and value else None


def _identifier(value: object) -> str | None:
    if isinstance(value, str):
        return value
    return _optional_string(_mapping(value).get("id"))


def _workspace_id(value: object) -> UUID | None:
    raw = _optional_string(value)
    if raw is None:
        return None
    try:
        return UUID(raw)
    except ValueError:
        return None


def _timestamp(value: object) -> datetime | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    try:
        return datetime.fromtimestamp(value, tz=timezone.utc)
    except (OverflowError, OSError, ValueError):
        return None


def _price_id(obj: Mapping[str, object]) -> str | None:
    items = _mapping(obj.get("items"))
    data = items.get("data")
    if not isinstance(data, list) or not data:
        return None
    price = _mapping(_mapping(data[0]).get("price"))
    return _optional_string(price.get("id"))


def _period_timestamp(
    obj: Mapping[str, object],
    field: str,
    choose: Callable[[list[datetime]], datetime],
) -> datetime | None:
    direct = _timestamp(obj.get(field))
    if direct is not None:
        return direct
    items = _mapping(obj.get("items"))
    data = items.get("data")
    if not isinstance(data, list):
        return None
    values = [
        value
        for item in data
        if (value := _timestamp(_mapping(item).get(field))) is not None
    ]
    return choose(values) if values else None


def _invoice_subscription_id(obj: Mapping[str, object]) -> str | None:
    parent = _mapping(obj.get("parent"))
    details = _mapping(parent.get("subscription_details"))
    return _identifier(details.get("subscription"))
