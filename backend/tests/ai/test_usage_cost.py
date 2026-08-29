from decimal import Decimal

import pytest

from app.ai.cost import (
    AIModelPricing,
    AIModelPricingTier,
    AIUsageCostEstimator,
)
from app.ai.provider import AIProviderUsage


def usage(
    *,
    input_tokens: int,
    output_tokens: int,
    cached_input_tokens: int = 0,
    cache_write_input_tokens: int = 0,
) -> AIProviderUsage:
    return AIProviderUsage(
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_tokens=input_tokens + output_tokens,
        cached_input_tokens=cached_input_tokens,
        cache_write_input_tokens=cache_write_input_tokens,
    )


def test_luna_standard_cost_counts_each_input_token_once() -> None:
    estimator = AIUsageCostEstimator()

    estimated = estimator.estimate(
        "gpt-5.6-luna",
        usage(
            input_tokens=1_000,
            output_tokens=500,
            cached_input_tokens=200,
            cache_write_input_tokens=100,
        ),
    )

    # 700 ordinary input + 200 cache reads + 100 cache writes + 500 output.
    assert estimated == Decimal("0.00076900")


def test_luna_long_context_pricing_applies_to_the_full_request() -> None:
    estimator = AIUsageCostEstimator()

    estimated = estimator.estimate(
        "gpt-5.6-luna",
        usage(input_tokens=272_001, output_tokens=1_000),
    )

    assert estimated == Decimal("0.11060040")


def test_cost_estimator_preserves_tiny_non_zero_and_zero_costs() -> None:
    estimator = AIUsageCostEstimator()

    assert estimator.estimate(
        "gpt-5.6-luna",
        usage(input_tokens=1, output_tokens=0, cached_input_tokens=1),
    ) == Decimal("0.00000002")
    assert estimator.estimate(
        "gpt-5.6-luna",
        usage(input_tokens=0, output_tokens=0),
    ) == Decimal("0E-8")


def test_cost_estimator_returns_unknown_without_pricing_or_usage() -> None:
    estimator = AIUsageCostEstimator()

    assert estimator.has_pricing("gpt-5.6-luna") is True
    assert estimator.has_pricing("unrecognized-model") is False
    assert (
        estimator.estimate("unrecognized-model", usage(input_tokens=1, output_tokens=1))
        is None
    )
    assert estimator.estimate("gpt-5.6-luna", None) is None


@pytest.mark.parametrize(
    "invalid_usage",
    [
        AIProviderUsage(input_tokens=-1, output_tokens=0, total_tokens=0),
        AIProviderUsage(input_tokens=1, output_tokens=1, total_tokens=1),
        AIProviderUsage(
            input_tokens=1,
            output_tokens=0,
            total_tokens=1,
            cached_input_tokens=2,
        ),
    ],
)
def test_invalid_usage_fails_closed_without_raising(
    invalid_usage: AIProviderUsage,
) -> None:
    assert AIUsageCostEstimator().estimate("gpt-5.6-luna", invalid_usage) is None


@pytest.mark.parametrize(
    "invalid_price", [Decimal("-1"), Decimal("NaN"), Decimal("Infinity")]
)
def test_pricing_rejects_negative_or_non_finite_values(
    invalid_price: Decimal,
) -> None:
    with pytest.raises(ValueError, match="finite and non-negative"):
        AIModelPricingTier(
            input_cost_per_1m_tokens=invalid_price,
            cached_input_cost_per_1m_tokens=Decimal("0"),
            cache_write_cost_per_1m_tokens=Decimal("0"),
            output_cost_per_1m_tokens=Decimal("0"),
        )


def test_long_context_configuration_must_be_complete() -> None:
    tier = AIModelPricingTier(
        input_cost_per_1m_tokens=Decimal("1"),
        cached_input_cost_per_1m_tokens=Decimal("0.1"),
        cache_write_cost_per_1m_tokens=Decimal("1.25"),
        output_cost_per_1m_tokens=Decimal("2"),
    )

    with pytest.raises(ValueError, match="configured together"):
        AIModelPricing(standard=tier, long_context=tier)
