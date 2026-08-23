from functools import lru_cache

from app.core.config import Settings, settings
from app.email.noop_provider import NoopEmailProvider
from app.email.provider import EmailProvider, EmailProviderConfigurationError
from app.email.resend_provider import ResendEmailProvider


def build_email_provider(configuration: Settings) -> EmailProvider:
    """Build the configured provider without exposing its credential."""

    if configuration.email_provider == "noop":
        return NoopEmailProvider()

    api_key = configuration.resend_api_key
    if api_key is None or not api_key.get_secret_value().strip():
        raise EmailProviderConfigurationError(
            "RESEND_API_KEY is required when TASKMINER_EMAIL_PROVIDER=resend."
        )
    if configuration.email_from is None or not configuration.email_from.strip():
        raise EmailProviderConfigurationError(
            "TASKMINER_EMAIL_FROM is required when TASKMINER_EMAIL_PROVIDER=resend."
        )
    return ResendEmailProvider(api_key.get_secret_value())


@lru_cache
def get_email_provider() -> EmailProvider:
    """Return the process-wide provider selected by server configuration."""

    return build_email_provider(settings)
