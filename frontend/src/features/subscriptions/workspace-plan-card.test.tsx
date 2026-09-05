import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    [proSubscriptionFixture, "Plan Pro", "2 / 25", "4 / 100", "7 / 500"],
  ])(
    "renders plan and backend-provided usage",
    (data, planLabel, members, projects, aiUsage) => {
      renderPlan(data);

      expect(screen.getByText(planLabel)).toBeInTheDocument();
      expect(screen.getByText(members)).toBeInTheDocument();
      expect(screen.getByText(projects)).toBeInTheDocument();
      expect(screen.getByText(aiUsage)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Passer à Pro/ }),
      ).toBeDisabled();
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
});

function renderPlan(
  data = freeSubscriptionFixture,
  error: unknown = null,
  onRetry = vi.fn(),
) {
  return render(
    <WorkspacePlanCard
      data={data}
      error={error}
      isPending={false}
      onRetry={onRetry}
      workspaceName="Workspace Alpha"
    />,
  );
}
