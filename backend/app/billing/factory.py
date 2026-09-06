from functools import lru_cache

from app.billing.provider import BillingConfigurationError, BillingProvider
from app.billing.stripe_provider import StripeBillingProvider
from app.core.config import Settings, settings


def build_billing_provider(configuration: Settings) -> BillingProvider:
    """Build Stripe only when every backend credential is present."""

    if not configuration.billing_enabled:
        raise BillingConfigurationError("Stripe billing is not configured.")
    assert configuration.stripe_secret_key is not None
    assert configuration.stripe_webhook_secret is not None
    return StripeBillingProvider(
        configuration.stripe_secret_key.get_secret_value(),
        configuration.stripe_webhook_secret.get_secret_value(),
    )


@lru_cache
def get_billing_provider() -> BillingProvider:
    return build_billing_provider(settings)
