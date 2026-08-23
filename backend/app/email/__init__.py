"""Transactional email providers and application-facing delivery service."""

from app.email.provider import (
    EmailDeliveryResult,
    EmailMessage,
    EmailProvider,
    EmailProviderConfigurationError,
    EmailProviderError,
)
from app.email.service import EmailService

__all__ = [
    "EmailDeliveryResult",
    "EmailMessage",
    "EmailProvider",
    "EmailProviderConfigurationError",
    "EmailProviderError",
    "EmailService",
]
