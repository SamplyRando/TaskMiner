from dataclasses import dataclass
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from types import MappingProxyType
from typing import Mapping

from app.ai.provider import AIProviderUsage


_ONE_MILLION = Decimal(1_000_000)
_COST_PRECISION = Decimal("0.00000001")


@dataclass(frozen=True)
class AIModelPricingTier:
    """USD prices per one million tokens for one model/context tier."""

    input_cost_per_1m_tokens: Decimal
    cached_input_cost_per_1m_tokens: Decimal
    cache_write_cost_per_1m_tokens: Decimal
    output_cost_per_1m_tokens: Decimal

    def __post_init__(self) -> None:
        for value in (
            self.input_cost_per_1m_tokens,
            self.cached_input_cost_per_1m_tokens,
            self.cache_write_cost_per_1m_tokens,
            self.output_cost_per_1m_tokens,
        ):
            if not value.is_finite() or value < 0:
                raise ValueError("AI model prices must be finite and non-negative.")


@dataclass(frozen=True)
class AIModelPricing:
    """Verified pricing for one exact model and service tier."""

    standard: AIModelPricingTier
    long_context: AIModelPricingTier | None = None
    long_context_threshold_tokens: int | None = None

    def __post_init__(self) -> None:
        if (self.long_context is None) != (self.long_context_threshold_tokens is None):
            raise ValueError(
                "Long-context pricing and its threshold must be configured together."
            )
        if (
            self.long_context_threshold_tokens is not None
            and self.long_context_threshold_tokens < 0
        ):
            raise ValueError("The long-context threshold must be non-negative.")

    def tier_for(self, input_tokens: int) -> AIModelPricingTier:
        if (
            self.long_context is not None
            and self.long_context_threshold_tokens is not None
            and input_tokens > self.long_context_threshold_tokens
        ):
            return self.long_context
        return self.standard


# OpenAI Standard/global pricing verified on 2026-08-28:
# https://developers.openai.com/api/docs/pricing
# https://developers.openai.com/api/docs/models/gpt-5.6-luna
OPENAI_STANDARD_PRICING: Mapping[str, AIModelPricing] = MappingProxyType(
    {
        "gpt-5.6-luna": AIModelPricing(
            standard=AIModelPricingTier(
                input_cost_per_1m_tokens=Decimal("0.20"),
                cached_input_cost_per_1m_tokens=Decimal("0.02"),
                cache_write_cost_per_1m_tokens=Decimal("0.25"),
                output_cost_per_1m_tokens=Decimal("1.20"),
            ),
            long_context=AIModelPricingTier(
                input_cost_per_1m_tokens=Decimal("0.40"),
                cached_input_cost_per_1m_tokens=Decimal("0.04"),
                cache_write_cost_per_1m_tokens=Decimal("0.50"),
                output_cost_per_1m_tokens=Decimal("1.80"),
            ),
            long_context_threshold_tokens=272_000,
        )
    }
)


class AIUsageCostEstimator:
    """Centralized, model-aware token cost estimator."""

    def __init__(
        self,
        pricing_registry: Mapping[str, AIModelPricing] = OPENAI_STANDARD_PRICING,
    ) -> None:
        self.pricing_registry = pricing_registry

    def has_pricing(self, model: str | None) -> bool:
        return model is not None and model in self.pricing_registry

    def estimate(
        self,
        model: str,
        usage: AIProviderUsage | None,
    ) -> Decimal | None:
        """Return a precise estimate, or None when safe pricing is unavailable."""

        pricing = self.pricing_registry.get(model)
        if pricing is None or usage is None or not self._is_valid_usage(usage):
            return None

        try:
            tier = pricing.tier_for(usage.input_tokens)
            ordinary_input_tokens = (
                usage.input_tokens
                - usage.cached_input_tokens
                - usage.cache_write_input_tokens
            )
            input_cost = (
                Decimal(ordinary_input_tokens) * tier.input_cost_per_1m_tokens
                + Decimal(usage.cached_input_tokens)
                * tier.cached_input_cost_per_1m_tokens
                + Decimal(usage.cache_write_input_tokens)
                * tier.cache_write_cost_per_1m_tokens
            ) / _ONE_MILLION
            output_cost = (
                Decimal(usage.output_tokens) * tier.output_cost_per_1m_tokens
            ) / _ONE_MILLION
            return (input_cost + output_cost).quantize(
                _COST_PRECISION,
                rounding=ROUND_HALF_UP,
            )
        except (ArithmeticError, InvalidOperation, ValueError):
            return None

    @staticmethod
    def _is_valid_usage(usage: AIProviderUsage) -> bool:
        values = (
            usage.input_tokens,
            usage.output_tokens,
            usage.total_tokens,
            usage.cached_input_tokens,
            usage.cache_write_input_tokens,
        )
        if any(
            not isinstance(value, int) or isinstance(value, bool) or value < 0
            for value in values
        ):
            return False
        if (
            usage.cached_input_tokens + usage.cache_write_input_tokens
            > usage.input_tokens
        ):
            return False
        return usage.total_tokens >= usage.input_tokens + usage.output_tokens
