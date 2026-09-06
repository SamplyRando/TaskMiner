import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/api/client";
import { WorkspacePlanCard } from "@/features/subscriptions/workspace-plan-card";
import {
  freeSubscriptionFixture,
  proSubscriptionFixture,
} from "@/test/subscription-fixtures";

describe("WorkspacePlanCard", () => {
  it.each([
    [freeSubscriptionFixture, "Plan Free", "2 / 3", "4 / 5", "7 / 25"],
    [proSubscriptionFixture, "Plan Pro", "2 / 15", "4 / 50", "7 / 500"],
  ])(
    "renders plan and backend-provided usage",
    (data, planLabel, members, projects, aiUsage) => {
      renderPlan(data);

      expect(screen.getByText(planLabel)).toBeInTheDocument();
      expect(screen.getByText(members)).toBeInTheDocument();
      expect(screen.getByText(projects)).toBeInTheDocument();
      expect(screen.getByText(aiUsage)).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeEnabled();
    },
  );

  it("renders an error with a working retry action", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderPlan(undefined, new ApiError("Limites indisponibles.", 503), onRetry);

    expect(screen.getByText("Limites indisponibles.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("starts checkout for a Free owner and opens the portal for Pro", async () => {
    const user = userEvent.setup();
    const onUpgrade = vi.fn();
    const onManageBilling = vi.fn();
    const { rerender } = renderPlan(freeSubscriptionFixture, null, vi.fn(), {
      onManageBilling,
      onUpgrade,
    });

    await user.click(screen.getByRole("button", { name: "Passer à Pro" }));
    expect(onUpgrade).toHaveBeenCalledOnce();

    rerender(
      <WorkspacePlanCard
        actionError={null}
        actionPending={false}
        canManageBilling
        data={proSubscriptionFixture}
        error={null}
        isPending={false}
        onManageBilling={onManageBilling}
        onRetry={vi.fn()}
        onUpgrade={onUpgrade}
        workspaceName="Workspace Alpha"
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Gérer l’abonnement" }),
    );
    expect(onManageBilling).toHaveBeenCalledOnce();
  });

  it("shows the next renewal date for an active Pro subscription", () => {
    renderPlan({
      ...proSubscriptionFixture,
      cancel_at_period_end: false,
      current_period_end: "2026-10-06T12:00:00Z",
      scheduled_cancellation_at: null,
    });

    expect(
      screen.getByText("Prochain renouvellement le 6 octobre 2026"),
    ).toBeInTheDocument();
  });

  it.each([false, true])(
    "shows scheduled cancellation for both Stripe cancellation representations",
    (cancelAtPeriodEnd) => {
      renderPlan({
        ...proSubscriptionFixture,
        cancel_at_period_end: cancelAtPeriodEnd,
        current_period_end: "2026-10-06T12:00:00Z",
        scheduled_cancellation_at: "2026-10-06T12:00:00Z",
      });

      expect(
        screen.getByText("Annulation prévue le 6 octobre 2026"),
      ).toBeInTheDocument();
      expect(screen.queryByText(/Prochain renouvellement/)).toBeNull();
      expect(screen.getByText("Plan Pro")).toBeInTheDocument();
      expect(screen.getByText("2 / 15")).toBeInTheDocument();
      expect(screen.getByText("4 / 50")).toBeInTheDocument();
      expect(screen.getByText("7 / 500")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Gérer l’abonnement" }),
      ).toBeEnabled();
    },
  );

  it("returns to renewal wording when scheduled cancellation is reversed", () => {
    const { rerender } = renderPlan({
      ...proSubscriptionFixture,
      cancel_at_period_end: true,
      current_period_end: "2026-10-06T12:00:00Z",
      scheduled_cancellation_at: "2026-10-06T12:00:00Z",
    });

    rerender(
      <WorkspacePlanCard
        actionError={null}
        actionPending={false}
        canManageBilling
        data={{
          ...proSubscriptionFixture,
          cancel_at_period_end: false,
          current_period_end: "2026-10-06T12:00:00Z",
          scheduled_cancellation_at: null,
        }}
        error={null}
        isPending={false}
        onManageBilling={vi.fn()}
        onRetry={vi.fn()}
        onUpgrade={vi.fn()}
        workspaceName="Workspace Alpha"
      />,
    );

    expect(
      screen.getByText("Prochain renouvellement le 6 octobre 2026"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Annulation prévue/)).toBeNull();
  });

  it("does not expose billing actions to non-owners", () => {
    renderPlan(freeSubscriptionFixture, null, vi.fn(), {
      canManageBilling: false,
    });

    expect(screen.queryByRole("button", { name: "Passer à Pro" })).toBeNull();
    expect(
      screen.getByText("Facturation gérée par le propriétaire"),
    ).toBeInTheDocument();
  });

  it("disables checkout when backend billing is unavailable", () => {
    renderPlan(
      { ...freeSubscriptionFixture, billing_enabled: false },
      null,
      vi.fn(),
    );

    expect(screen.getByRole("button", { name: "Passer à Pro" })).toBeDisabled();
    expect(
      screen.getByText(/facturation en ligne est momentanément indisponible/i),
    ).toBeInTheDocument();
  });

  it("locks billing actions while loading and hides raw provider errors", () => {
    const { rerender } = renderPlan(freeSubscriptionFixture, null, vi.fn(), {
      actionPending: true,
    });

    expect(screen.getByRole("button", { name: /Passer à Pro/ })).toBeDisabled();

    rerender(
      <WorkspacePlanCard
        actionError={new ApiError("raw Stripe provider payload", 502)}
        actionPending={false}
        canManageBilling
        data={freeSubscriptionFixture}
        error={null}
        isPending={false}
        onManageBilling={vi.fn()}
        onRetry={vi.fn()}
        onUpgrade={vi.fn()}
        workspaceName="Workspace Alpha"
      />,
    );
    expect(
      screen.getByText(
        "La facturation est temporairement indisponible. Réessayez plus tard.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/raw Stripe/i)).toBeNull();
  });
});

function renderPlan(
  data = freeSubscriptionFixture,
  error: unknown = null,
  onRetry = vi.fn(),
  overrides: Partial<ComponentProps<typeof WorkspacePlanCard>> = {},
) {
  return render(
    <WorkspacePlanCard
      actionError={null}
      actionPending={false}
      canManageBilling
      data={data}
      error={error}
      isPending={false}
      onManageBilling={vi.fn()}
      onRetry={onRetry}
      onUpgrade={vi.fn()}
      workspaceName="Workspace Alpha"
      {...overrides}
    />,
  );
}
