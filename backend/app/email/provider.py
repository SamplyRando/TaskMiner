from dataclasses import dataclass
from typing import Literal, Protocol


EmailProviderName = Literal["noop", "resend"]


class EmailProviderError(Exception):
    """Raised when a transactional email provider cannot accept a message."""


class EmailProviderConfigurationError(EmailProviderError):
    """Raised when the selected provider lacks required server configuration."""


@dataclass(frozen=True)
class EmailMessage:
    """Provider-neutral transactional email payload."""

    sender: str
    recipient: str
    subject: str
    html: str
    text: str
    idempotency_key: str


@dataclass(frozen=True)
class EmailDeliveryResult:
    """Result returned without leaking provider-specific response data."""

    delivered: bool


class EmailProvider(Protocol):
    """Provider-neutral contract for sending transactional email."""

    @property
    def provider_name(self) -> EmailProviderName:
        """Return the configured provider name."""
        ...

    def send(self, message: EmailMessage) -> EmailDeliveryResult:
        """Submit a message to the configured provider."""
        ...
