from typing import Any

import pytest

from app.ai.factory import build_ai_provider
from app.ai.mock_provider import MockAIProvider
from app.ai.openai_provider import OpenAIProvider
from app.ai.provider import AIProviderConfigurationError
from app.core.config import Settings


def build_settings(**overrides: object) -> Settings:
    values: dict[str, Any] = {
        "DATABASE_URL": "postgresql://user:password@host/database",
        "SECRET_KEY": "provider-test-secret-key-at-least-32-characters",
        "ACCESS_TOKEN_EXPIRE_MINUTES": 30,
        "ALGORITHM": "HS256",
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)  # type: ignore[call-arg]


def test_mock_provider_is_the_safe_default() -> None:
    provider = build_ai_provider(build_settings())

    assert isinstance(provider, MockAIProvider)
    assert provider.provider_name == "mock"


def test_explicit_mock_provider_does_not_require_an_openai_key() -> None:
    provider = build_ai_provider(
        build_settings(TASKMINER_AI_PROVIDER="mock", OPENAI_API_KEY=None)
    )

    assert isinstance(provider, MockAIProvider)


def test_openai_provider_uses_server_side_configuration() -> None:
    provider = build_ai_provider(
        build_settings(
            TASKMINER_AI_PROVIDER="openai",
            OPENAI_API_KEY="tests-only-openai-key",
            TASKMINER_OPENAI_MODEL="gpt-5.6-luna",
        )
    )

    assert isinstance(provider, OpenAIProvider)
    assert provider.provider_name == "openai"
    assert provider.display_name == "OpenAI"
    assert provider.model == "gpt-5.6-luna"


def test_openai_provider_fails_clearly_without_a_key() -> None:
    with pytest.raises(
        AIProviderConfigurationError,
        match="OPENAI_API_KEY is required",
    ):
        build_ai_provider(
            build_settings(
                TASKMINER_AI_PROVIDER="openai",
                OPENAI_API_KEY=None,
            )
        )


def test_invalid_provider_name_fails_settings_validation() -> None:
    with pytest.raises(ValueError):
        build_settings(TASKMINER_AI_PROVIDER="unsupported")
