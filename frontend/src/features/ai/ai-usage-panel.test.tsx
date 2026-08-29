import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/api/client";
import { AIUsagePanel } from "@/features/ai/ai-usage-panel";
import { aiUsageFixture } from "@/test/ai-fixtures";

describe("AIUsagePanel", () => {
  it("renders monthly quota, cost, and aggregate metrics", () => {
    render(
      <AIUsagePanel
        data={aiUsageFixture}
        error={null}
        isPending={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText("27 / 100 requêtes")).toBeInTheDocument();
    expect(screen.getByText("73 restantes")).toBeInTheDocument();
    expect(screen.getByText("25 / 2")).toBeInTheDocument();
    expect(screen.getByText(/0,42/)).toBeInTheDocument();
    expect(screen.getByText("1850 ms")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", {
        name: "Quota mensuel TaskMiner AI utilisé",
      }),
    ).toHaveAttribute("aria-valuenow", "27");
  });

  it("shows loading and quota warning states", () => {
    const { rerender } = render(
      <AIUsagePanel
        data={undefined}
        error={null}
        isPending
        onRetry={vi.fn()}
      />,
    );
    expect(
      screen.getByLabelText("Chargement de l’utilisation IA"),
    ).toHaveAttribute("aria-busy", "true");

    rerender(
      <AIUsagePanel
        data={{
          ...aiUsageFixture,
          requests_remaining: 0,
          requests_used: 100,
        }}
        error={null}
        isPending={false}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByText("Quota atteint")).toBeInTheDocument();

    rerender(
      <AIUsagePanel
        data={{
          ...aiUsageFixture,
          requests_remaining: 10,
          requests_used: 90,
        }}
        error={null}
        isPending={false}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByText("Quota bientôt atteint")).toBeInTheDocument();
  });

  it("renders a safe error with retry", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <AIUsagePanel
        data={undefined}
        error={new ApiError("Service temporairement indisponible.", 503)}
        isPending={false}
        onRetry={onRetry}
      />,
    );

    expect(
      screen.getByText("Service temporairement indisponible."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/openai_api_key/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not invent a cost when pricing is unknown", () => {
    render(
      <AIUsagePanel
        data={{ ...aiUsageFixture, pricing_configured: false }}
        error={null}
        isPending={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText("Tarification non configurée")).toBeInTheDocument();
  });

  it("keeps tiny non-zero costs readable and updates after refreshed data", () => {
    const { rerender } = render(
      <AIUsagePanel
        data={{ ...aiUsageFixture, estimated_cost_usd: 0.00000002 }}
        error={null}
        isPending={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText(/0,00000002/)).toBeInTheDocument();

    rerender(
      <AIUsagePanel
        data={{ ...aiUsageFixture, estimated_cost_usd: 0.000769 }}
        error={null}
        isPending={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText(/0,000769/)).toBeInTheDocument();
    expect(screen.queryByText(/0,00000002/)).not.toBeInTheDocument();
  });
});
