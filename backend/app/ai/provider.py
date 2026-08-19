from typing import Literal, Protocol

from app.ai.schemas import (
    AIProjectChangePlanRequest,
    AIProjectChangePlanResponse,
    AIProjectContext,
    AIProjectPlanRequest,
    AIProjectPlanResponse,
)


AIProviderName = Literal["mock", "openai"]


class AIProviderError(Exception):
    """Base class for safe provider-facing generation failures."""


class AIProviderConfigurationError(AIProviderError):
    """Raised when the selected provider is not configured."""


class AIProviderAuthenticationError(AIProviderError):
    """Raised when the remote provider rejects its server credential."""


class AIProviderTimeoutError(AIProviderError):
    """Raised when a provider does not answer within the configured timeout."""


class AIProviderRateLimitError(AIProviderError):
    """Raised when a remote provider temporarily rate-limits generation."""


class AIProviderUnavailableError(AIProviderError):
    """Raised when a remote provider cannot be reached or complete a request."""


class AIProviderResponseError(AIProviderError):
    """Raised when a provider response cannot form a safe proposal."""


class AIProviderRefusalError(AIProviderResponseError):
    """Raised when the model refuses to generate the requested proposal."""


class AIProvider(Protocol):
    """Provider-neutral contract for project-plan generation."""

    provider_name: AIProviderName
    display_name: str

    async def generate_project_plan(
        self,
        request: AIProjectPlanRequest,
    ) -> AIProjectPlanResponse:
        """Generate a structured draft without mutating TaskMiner resources."""
        ...

    async def generate_project_change_plan(
        self,
        request: AIProjectChangePlanRequest,
        context: AIProjectContext,
    ) -> AIProjectChangePlanResponse:
        """Generate task changes from a safe server-owned project snapshot."""
        ...
