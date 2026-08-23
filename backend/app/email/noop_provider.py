from typing import Literal

from app.email.provider import EmailDeliveryResult, EmailMessage


class NoopEmailProvider:
    """Development-safe provider that performs no external delivery."""

    provider_name: Literal["noop"] = "noop"

    def send(self, message: EmailMessage) -> EmailDeliveryResult:
        del message
        return EmailDeliveryResult(delivered=False)
