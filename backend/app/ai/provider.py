from dataclasses import dataclass
from typing import Generic, Literal, Protocol, TypeVar

from app.ai.schemas import (
    AIProjectChangePlanRequest,
    AIProjectChangePlanResponse,
    AIProjectContext,
    AIProjectPlanRequest,
    AIProjectPlanningContext,
    AIProjectPlanResponse,
)


AIProviderName = Literal["mock", "openai"]
ProviderResponseT = TypeVar("ProviderResponseT")


@dataclass(frozen=True)
class AIProviderUsage:
    """Provider-reported token totals; absent for providers without metering."""

    input_tokens: int
    output_tokens: int
    total_tokens: int
    cached_input_tokens: int = 0
    cache_write_input_tokens: int = 0


@dataclass(frozen=True)
class AIProviderResult(Generic[ProviderResponseT]):
    """Validated proposal plus metadata kept outside the public API contract."""

    value: ProviderResponseT
    usage: AIProviderUsage | None = None


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
    model_name: str

    async def generate_project_plan(
        self,
        request: AIProjectPlanRequest,
        context: AIProjectPlanningContext,
    ) -> AIProviderResult[AIProjectPlanResponse]:
        """Generate a structured draft without mutating TaskMiner resources."""
        ...

    async def generate_project_change_plan(
        self,
        request: AIProjectChangePlanRequest,
        context: AIProjectContext,
    ) -> AIProviderResult[AIProjectChangePlanResponse]:
        """Generate task changes from a safe server-owned project snapshot."""
        ...
