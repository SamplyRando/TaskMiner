from typing import Literal

import resend
from resend.exceptions import ResendError

from app.email.provider import (
    EmailDeliveryResult,
    EmailMessage,
    EmailProviderError,
)


RESEND_TIMEOUT_SECONDS = 10


class ResendEmailProvider:
    """Resend adapter for TaskMiner transactional email."""

    provider_name: Literal["resend"] = "resend"

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    def send(self, message: EmailMessage) -> EmailDeliveryResult:
        params: resend.Emails.SendParams = {
            "from": message.sender,
            "to": [message.recipient],
            "subject": message.subject,
            "html": message.html,
            "text": message.text,
        }
        options: resend.Emails.SendOptions = {
            "idempotency_key": message.idempotency_key,
        }

        try:
            resend.api_key = self._api_key
            resend.default_http_client = resend.RequestsClient(
                timeout=RESEND_TIMEOUT_SECONDS
            )
            resend.Emails.send(params, options)
        except ResendError as exc:
            raise EmailProviderError("Transactional email delivery failed.") from exc
        except Exception as exc:
            raise EmailProviderError("Transactional email delivery failed.") from exc

        return EmailDeliveryResult(delivered=True)
