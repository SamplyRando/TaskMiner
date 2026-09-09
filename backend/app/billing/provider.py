from dataclasses import dataclass
from datetime import datetime
from typing import Literal, Protocol
from uuid import UUID


class BillingProviderError(Exception):
    """Raised when the billing provider cannot complete a safe operation."""


class BillingConfigurationError(BillingProviderError):
    """Raised when server-side billing configuration is incomplete."""


class BillingSignatureError(BillingProviderError):
    """Raised when a webhook signature cannot be verified."""


@dataclass(frozen=True)
class CheckoutSessionRequest:
    workspace_id: UUID
    attempt_id: UUID
    customer_email: str
    customer_id: str | None
    price_id: str
    success_url: str
    cancel_url: str
    expires_at: datetime


@dataclass(frozen=True)
class BillingPortalRequest:
    customer_id: str
    return_url: str


@dataclass(frozen=True)
class BillingRedirect:
    url: str


@dataclass(frozen=True)
class BillingCheckoutSession:
    id: str
    url: str
    expires_at: datetime


@dataclass(frozen=True)
class BillingSubscriptionState:
    workspace_id: UUID | None
    customer_id: str | None
    subscription_id: str
    price_id: str | None
    provider_status: str
    current_period_start: datetime | None
    current_period_end: datetime | None
    cancel_at_period_end: bool
    cancel_at: datetime | None


@dataclass(frozen=True)
class BillingEvent:
    event_id: str
    event_type: str
    created_at: datetime
    workspace_id: UUID | None
    customer_id: str | None
    subscription_id: str | None
    price_id: str | None
    provider_status: str | None
    payment_status: str | None
    current_period_start: datetime | None
    current_period_end: datetime | None
    cancel_at_period_end: bool
    cancel_at: datetime | None
    checkout_session_id: str | None = None


@dataclass(frozen=True)
class BillingWebhookResult:
    duplicate: bool
    handled: bool


class BillingProvider(Protocol):
    provider_name: Literal["stripe"]

    def create_checkout_session(
        self,
        request: CheckoutSessionRequest,
    ) -> BillingCheckoutSession:
        """Create a hosted subscription Checkout session."""
        ...

    def create_portal_session(
        self,
        request: BillingPortalRequest,
    ) -> BillingRedirect:
        """Create a short-lived hosted Customer Portal session."""
        ...

    def parse_webhook(self, payload: bytes, signature: str | None) -> BillingEvent:
        """Verify and normalize a provider webhook without leaking raw data."""
        ...

    def retrieve_subscription(
        self,
        subscription_id: str,
    ) -> BillingSubscriptionState:
        """Return current normalized provider state for deterministic reconciliation."""
        ...
