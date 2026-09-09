from dataclasses import replace
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit, urlunsplit
from uuid import UUID, uuid4

from app.billing.provider import (
    BillingEvent,
    BillingPortalRequest,
    BillingProvider,
    BillingRedirect,
    BillingWebhookResult,
    CheckoutSessionRequest,
)
from app.models.user import User
from app.models.workspace_subscription import WorkspaceSubscription
from app.repositories.billing import BillingRepository
from app.services.permission import PermissionDeniedError, PermissionService
from app.subscriptions.plans import (
    PlanCode,
    SubscriptionSource,
    SubscriptionStatus,
)


SUPPORTED_STRIPE_EVENTS = {
    "checkout.session.completed",
    "checkout.session.expired",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.payment_failed",
}

# Stripe requires Checkout expiration to be at least 30 minutes in the future.
# The extra minute absorbs request/clock transit while keeping attempts bounded.
CHECKOUT_ATTEMPT_LIFETIME = timedelta(minutes=31)


class BillingStateError(Exception):
    """Raised when the current subscription cannot start a billing action."""


class BillingEventConflictError(Exception):
    """Raised when a signed event conflicts with persisted Stripe identity."""


class BillingEventInvalidError(Exception):
    """Raised when a relevant signed event lacks required safe identifiers."""


class BillingService:
    """Authorize hosted billing and apply signed Stripe state transitions."""

    def __init__(
        self,
        repository: BillingRepository,
        permission_service: PermissionService,
        provider: BillingProvider,
        *,
        pro_price_id: str,
        success_url: str,
        cancel_url: str,
    ) -> None:
        self.repository = repository
        self.permission_service = permission_service
        self.provider = provider
        self.pro_price_id = pro_price_id
        self.success_url = success_url
        self.cancel_url = cancel_url

    def create_checkout(self, user: User, workspace_id: UUID) -> BillingRedirect:
        workspace = self.permission_service.require_workspace_view(user, workspace_id)
        if workspace.owner_id != user.id:
            raise PermissionDeniedError
        subscription = self.repository.get_for_workspace(workspace_id, for_update=True)
        if subscription is None:
            raise BillingStateError("Workspace subscription is unavailable.")
        if (
            subscription.plan_code != PlanCode.FREE
            or subscription.stripe_subscription_id is not None
        ):
            raise BillingStateError("This workspace cannot start a Pro checkout.")
        now = datetime.now(timezone.utc)
        if (
            subscription.stripe_checkout_url is not None
            and subscription.stripe_checkout_expires_at is not None
            and subscription.stripe_checkout_expires_at > now
        ):
            redirect = BillingRedirect(subscription.stripe_checkout_url)
            self.repository.commit()
            return redirect

        if (
            subscription.checkout_attempt_id is not None
            and subscription.checkout_attempt_started_at is not None
            and subscription.checkout_attempt_started_at + CHECKOUT_ATTEMPT_LIFETIME
            > now
        ):
            attempt_id = subscription.checkout_attempt_id
            expires_at = (
                subscription.checkout_attempt_started_at + CHECKOUT_ATTEMPT_LIFETIME
            )
        else:
            attempt_id = uuid4()
            expires_at = now + CHECKOUT_ATTEMPT_LIFETIME
            subscription.checkout_attempt_id = attempt_id
            subscription.checkout_attempt_started_at = now
            subscription.stripe_checkout_session_id = None
            subscription.stripe_checkout_url = None
            subscription.stripe_checkout_expires_at = None
        customer_id = subscription.stripe_customer_id
        self.repository.flush()
        self.repository.commit()

        checkout = self.provider.create_checkout_session(
            CheckoutSessionRequest(
                workspace_id=workspace_id,
                attempt_id=attempt_id,
                customer_email=user.email,
                customer_id=customer_id,
                price_id=self.pro_price_id,
                success_url=self.success_url,
                cancel_url=self.cancel_url,
                expires_at=expires_at,
            )
        )
        current = self.repository.get_for_workspace(workspace_id, for_update=True)
        if current is None:
            self.repository.rollback()
            raise BillingStateError("Workspace subscription is unavailable.")
        if (
            current.plan_code != PlanCode.FREE
            or current.stripe_subscription_id is not None
        ):
            self.repository.rollback()
            raise BillingStateError("This workspace cannot start a Pro checkout.")
        if current.checkout_attempt_id != attempt_id:
            self.repository.rollback()
            raise BillingStateError("A newer Checkout attempt already exists.")
        current.stripe_checkout_session_id = checkout.id
        current.stripe_checkout_url = checkout.url
        current.stripe_checkout_expires_at = checkout.expires_at
        self.repository.flush()
        self.repository.commit()
        return BillingRedirect(checkout.url)

    def create_portal(self, user: User, workspace_id: UUID) -> BillingRedirect:
        workspace = self.permission_service.require_workspace_view(user, workspace_id)
        if workspace.owner_id != user.id:
            raise PermissionDeniedError
        subscription = self.repository.get_for_workspace(workspace_id)
        if (
            subscription is None
            or subscription.plan_code != PlanCode.PRO
            or subscription.stripe_customer_id is None
        ):
            raise BillingStateError("The billing portal is unavailable.")

        return self.provider.create_portal_session(
            BillingPortalRequest(
                customer_id=subscription.stripe_customer_id,
                return_url=_without_query(self.success_url),
            )
        )

    def handle_webhook(self, event: BillingEvent) -> BillingWebhookResult:
        if not self.repository.claim_event(
            event.event_id,
            event.event_type,
            event.created_at,
        ):
            self.repository.rollback()
            return BillingWebhookResult(duplicate=True, handled=False)

        try:
            handled = self._apply_event(event)
            self.repository.commit()
        except Exception:
            self.repository.rollback()
            raise
        return BillingWebhookResult(duplicate=False, handled=handled)

    def _apply_event(self, event: BillingEvent) -> bool:
        if event.event_type not in SUPPORTED_STRIPE_EVENTS:
            return False

        subscription = self._resolve_subscription(event)
        if subscription is None:
            return False
        self.repository.associate_event(event.event_id, subscription.workspace_id)

        if event.event_type == "checkout.session.completed":
            return self._link_checkout(subscription, event)
        if event.event_type == "checkout.session.expired":
            return self._expire_checkout(subscription, event)
        if event.event_type == "invoice.payment_failed":
            return self._mark_payment_failed(subscription, event)
        return self._apply_subscription_state(subscription, event)

    def _resolve_subscription(
        self,
        event: BillingEvent,
    ) -> WorkspaceSubscription | None:
        candidates = [
            candidate
            for candidate in (
                self.repository.get_by_subscription_id(event.subscription_id)
                if event.subscription_id is not None
                else None,
                self.repository.get_by_customer_id(event.customer_id)
                if event.customer_id is not None
                else None,
                self.repository.get_for_workspace(event.workspace_id)
                if event.workspace_id is not None
                else None,
            )
            if candidate is not None
        ]
        if not candidates:
            return None
        workspace_ids = {candidate.workspace_id for candidate in candidates}
        if len(workspace_ids) != 1:
            raise BillingEventConflictError(
                "Stripe identifiers resolve to different workspaces."
            )
        workspace_id = next(iter(workspace_ids))
        subscription = self.repository.get_for_workspace(
            workspace_id,
            for_update=True,
        )
        if subscription is None:
            return None
        self._validate_identity(subscription, event)
        return subscription

    @staticmethod
    def _validate_identity(
        subscription: WorkspaceSubscription,
        event: BillingEvent,
    ) -> None:
        if (
            event.workspace_id is not None
            and event.workspace_id != subscription.workspace_id
        ):
            raise BillingEventConflictError("Stripe workspace metadata conflicts.")
        if (
            event.customer_id is not None
            and subscription.stripe_customer_id is not None
            and event.customer_id != subscription.stripe_customer_id
        ):
            raise BillingEventConflictError("Stripe customer identity conflicts.")
        if (
            event.subscription_id is not None
            and subscription.stripe_subscription_id is not None
            and event.subscription_id != subscription.stripe_subscription_id
        ):
            raise BillingEventConflictError("Stripe subscription identity conflicts.")

    def _link_checkout(
        self,
        subscription: WorkspaceSubscription,
        event: BillingEvent,
    ) -> bool:
        if subscription.stripe_event_created_at is not None:
            return True
        if event.customer_id is None or event.subscription_id is None:
            raise BillingEventInvalidError(
                "Completed checkout is missing a customer or subscription."
            )
        subscription.stripe_customer_id = event.customer_id
        subscription.stripe_subscription_id = event.subscription_id
        subscription.source = SubscriptionSource.STRIPE
        self._clear_checkout_attempt(subscription)
        self.repository.flush()
        return True

    def _expire_checkout(
        self,
        subscription: WorkspaceSubscription,
        event: BillingEvent,
    ) -> bool:
        if (
            subscription.stripe_checkout_session_id is not None
            and event.checkout_session_id == subscription.stripe_checkout_session_id
        ):
            self._clear_checkout_attempt(subscription)
            self.repository.flush()
        return True

    def _apply_subscription_state(
        self,
        subscription: WorkspaceSubscription,
        event: BillingEvent,
        *,
        reconcile_equal: bool = True,
    ) -> bool:
        if event.subscription_id is None or event.provider_status is None:
            raise BillingEventInvalidError("Subscription event is incomplete.")
        if self._is_stale(subscription, event):
            return True
        if reconcile_equal and self._has_equal_timestamp(subscription, event):
            event = self._current_subscription_event(event)
        if event.provider_status is None:
            raise BillingEventInvalidError("Subscription event has no status.")

        is_deletion = event.event_type == "customer.subscription.deleted"
        if event.price_id != self.pro_price_id and not is_deletion:
            if subscription.stripe_subscription_id != event.subscription_id:
                return False
            subscription.plan_code = PlanCode.FREE
            subscription.status = SubscriptionStatus.INACTIVE
            subscription.stripe_price_id = event.price_id
            subscription.stripe_event_created_at = event.created_at
            self.repository.flush()
            return True

        subscription.stripe_customer_id = (
            event.customer_id or subscription.stripe_customer_id
        )
        subscription.stripe_subscription_id = event.subscription_id
        subscription.stripe_price_id = event.price_id
        subscription.source = SubscriptionSource.STRIPE
        subscription.current_period_start = (
            event.current_period_start or subscription.current_period_start
        )
        subscription.current_period_end = (
            event.current_period_end or subscription.current_period_end
        )
        subscription.cancel_at_period_end = event.cancel_at_period_end
        subscription.cancel_at = event.cancel_at
        subscription.stripe_event_created_at = event.created_at
        self._clear_checkout_attempt(subscription)

        if is_deletion:
            subscription.plan_code = PlanCode.FREE
            subscription.status = SubscriptionStatus.CANCELED
            subscription.stripe_subscription_id = None
            subscription.stripe_price_id = None
            subscription.cancel_at_period_end = False
            subscription.cancel_at = None
        else:
            subscription.plan_code = PlanCode.PRO
            subscription.status = _normalize_subscription_status(event.provider_status)
        self.repository.flush()
        return True

    def _mark_payment_failed(
        self,
        subscription: WorkspaceSubscription,
        event: BillingEvent,
    ) -> bool:
        if self._is_stale(subscription, event):
            return True
        if event.subscription_id is None:
            raise BillingEventInvalidError("Failed invoice has no subscription.")
        if self._has_equal_timestamp(subscription, event):
            return self._apply_subscription_state(
                subscription,
                self._current_subscription_event(event),
                reconcile_equal=False,
            )
        subscription.plan_code = PlanCode.PRO
        subscription.status = SubscriptionStatus.PAST_DUE
        subscription.source = SubscriptionSource.STRIPE
        subscription.stripe_event_created_at = event.created_at
        self.repository.flush()
        return True

    @staticmethod
    def _is_stale(
        subscription: WorkspaceSubscription,
        event: BillingEvent,
    ) -> bool:
        return (
            subscription.stripe_event_created_at is not None
            and event.created_at < subscription.stripe_event_created_at
        )

    @staticmethod
    def _has_equal_timestamp(
        subscription: WorkspaceSubscription,
        event: BillingEvent,
    ) -> bool:
        return subscription.stripe_event_created_at == event.created_at

    def _current_subscription_event(self, event: BillingEvent) -> BillingEvent:
        if event.subscription_id is None:
            raise BillingEventInvalidError("Subscription event has no subscription.")
        current = self.provider.retrieve_subscription(event.subscription_id)
        if current.subscription_id != event.subscription_id:
            raise BillingEventConflictError(
                "Current Stripe subscription identity conflicts."
            )
        if (
            current.workspace_id is not None
            and event.workspace_id is not None
            and current.workspace_id != event.workspace_id
        ):
            raise BillingEventConflictError(
                "Current Stripe workspace metadata conflicts."
            )
        if (
            current.customer_id is not None
            and event.customer_id is not None
            and current.customer_id != event.customer_id
        ):
            raise BillingEventConflictError(
                "Current Stripe customer identity conflicts."
            )
        terminal = current.provider_status in {"canceled", "incomplete_expired"}
        return replace(
            event,
            event_type=(
                "customer.subscription.deleted"
                if terminal
                else "customer.subscription.updated"
            ),
            workspace_id=current.workspace_id or event.workspace_id,
            customer_id=current.customer_id,
            subscription_id=current.subscription_id,
            price_id=current.price_id,
            provider_status=current.provider_status,
            current_period_start=current.current_period_start,
            current_period_end=current.current_period_end,
            cancel_at_period_end=current.cancel_at_period_end,
            cancel_at=current.cancel_at,
        )

    @staticmethod
    def _clear_checkout_attempt(subscription: WorkspaceSubscription) -> None:
        subscription.checkout_attempt_id = None
        subscription.checkout_attempt_started_at = None
        subscription.stripe_checkout_session_id = None
        subscription.stripe_checkout_url = None
        subscription.stripe_checkout_expires_at = None


def _normalize_subscription_status(value: str) -> SubscriptionStatus:
    statuses = {
        "active": SubscriptionStatus.ACTIVE,
        "trialing": SubscriptionStatus.TRIALING,
        "past_due": SubscriptionStatus.PAST_DUE,
        "unpaid": SubscriptionStatus.PAST_DUE,
        "canceled": SubscriptionStatus.CANCELED,
        "incomplete": SubscriptionStatus.INCOMPLETE,
        "incomplete_expired": SubscriptionStatus.INCOMPLETE,
        "paused": SubscriptionStatus.INACTIVE,
    }
    return statuses.get(value, SubscriptionStatus.INACTIVE)


def _without_query(url: str) -> str:
    parsed = urlsplit(url)
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", ""))
