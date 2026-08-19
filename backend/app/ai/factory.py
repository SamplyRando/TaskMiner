from functools import lru_cache

from app.ai.mock_provider import MockAIProvider
from app.ai.openai_provider import OpenAIProvider
from app.ai.provider import AIProvider, AIProviderConfigurationError
from app.core.config import Settings, settings


def build_ai_provider(configuration: Settings) -> AIProvider:
    """Build the configured proposal provider without exposing its credential."""

    if configuration.ai_provider == "mock":
        return MockAIProvider()

    api_key = configuration.openai_api_key
    if api_key is None or not api_key.get_secret_value().strip():
        raise AIProviderConfigurationError(
            "OPENAI_API_KEY is required when TASKMINER_AI_PROVIDER=openai."
        )
    return OpenAIProvider(
        api_key=api_key.get_secret_value(),
        model=configuration.openai_model,
    )


@lru_cache
def get_ai_provider() -> AIProvider:
    """Return the process-wide provider selected by server configuration."""

    return build_ai_provider(settings)
