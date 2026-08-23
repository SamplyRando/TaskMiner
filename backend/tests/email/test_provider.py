from typing import Any

import pytest
import resend

from app.core.config import Settings
from app.email.factory import build_email_provider
from app.email.noop_provider import NoopEmailProvider
from app.email.provider import EmailMessage, EmailProviderError
from app.email.resend_provider import ResendEmailProvider


def build_settings(**overrides: object) -> Settings:
    values: dict[str, Any] = {
        "DATABASE_URL": "postgresql://user:password@host/database",
        "SECRET_KEY": "email-test-secret-key-at-least-32-characters",
        "ACCESS_TOKEN_EXPIRE_MINUTES": 30,
        "ALGORITHM": "HS256",
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)  # type: ignore[call-arg]


def build_message() -> EmailMessage:
    return EmailMessage(
        sender="TaskMiner <invitations@taskminer.app>",
        recipient="invitee@example.com",
        subject="Invitation TaskMiner",
        html="<p>Invitation</p>",
        text="Invitation",
        idempotency_key="workspace-invitation/test/attempt",
    )


def test_noop_provider_is_safe_default() -> None:
    provider = build_email_provider(build_settings())

    assert isinstance(provider, NoopEmailProvider)
    assert provider.send(build_message()).delivered is False


def test_resend_provider_uses_server_side_configuration() -> None:
    provider = build_email_provider(
        build_settings(
            TASKMINER_EMAIL_PROVIDER="resend",
            RESEND_API_KEY="tests-only-resend-key",
            TASKMINER_EMAIL_FROM="TaskMiner <invitations@taskminer.app>",
        )
    )

    assert isinstance(provider, ResendEmailProvider)


@pytest.mark.parametrize(
    ("missing_field", "message"),
    [
        ("RESEND_API_KEY", "RESEND_API_KEY is required"),
        ("TASKMINER_EMAIL_FROM", "TASKMINER_EMAIL_FROM is required"),
    ],
)
def test_resend_configuration_is_required(
    missing_field: str,
    message: str,
) -> None:
    values: dict[str, object] = {
        "TASKMINER_EMAIL_PROVIDER": "resend",
        "RESEND_API_KEY": "tests-only-resend-key",
        "TASKMINER_EMAIL_FROM": "TaskMiner <invitations@taskminer.app>",
    }
    values.pop(missing_field)

    with pytest.raises(ValueError, match=message):
        build_settings(**values)


def test_resend_provider_sends_both_html_and_text(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, object] = {}

    def send(params: object, options: object) -> dict[str, str]:
        captured["params"] = params
        captured["options"] = options
        return {"id": "email-test-id"}

    monkeypatch.setattr(resend.Emails, "send", send)
    provider = ResendEmailProvider("tests-only-resend-key")

    result = provider.send(build_message())

    assert result.delivered is True
    assert captured["params"] == {
        "from": "TaskMiner <invitations@taskminer.app>",
        "to": ["invitee@example.com"],
        "subject": "Invitation TaskMiner",
        "html": "<p>Invitation</p>",
        "text": "Invitation",
    }
    assert captured["options"] == {
        "idempotency_key": "workspace-invitation/test/attempt"
    }


def test_resend_provider_hides_upstream_errors(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fail(params: object, options: object) -> None:
        del params, options
        raise RuntimeError("provider-internal-sensitive-response")

    monkeypatch.setattr(resend.Emails, "send", fail)

    with pytest.raises(
        EmailProviderError,
        match="Transactional email delivery failed",
    ) as error:
        ResendEmailProvider("tests-only-resend-key").send(build_message())

    assert "provider-internal-sensitive-response" not in str(error.value)


@pytest.mark.parametrize(
    "frontend_url",
    [
        "https://www.taskminer.app/path",
        "https://www.taskminer.app/?token=unsafe",
        "https://www.taskminer.app/#fragment",
    ],
)
def test_frontend_url_must_be_a_clean_origin(frontend_url: str) -> None:
    with pytest.raises(ValueError, match="TASKMINER_FRONTEND_URL"):
        build_settings(TASKMINER_FRONTEND_URL=frontend_url)
