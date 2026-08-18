import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/api/client";
import { AIProjectChangeReview } from "@/features/ai/ai-project-change-review";
import { aiChangePlanFixture } from "@/test/ai-fixtures";
import { workspaceId } from "@/test/resource-fixtures";
import type { AIApplyProjectChangePlanRequest } from "@/types/ai";

const idempotencyKey = "60000000-0000-4000-8000-000000000001";

const renderReview = (error: unknown = null) => {
  const onApply = vi.fn<
    (request: AIApplyProjectChangePlanRequest) => Promise<void>
  >(() => Promise.resolve());
  render(
    <AIProjectChangeReview
      error={error}
      idempotencyKey={idempotencyKey}
      initialReviewValues={null}
      isPending={false}
      onApply={onApply}
      onReviewChange={() => undefined}
      plan={aiChangePlanFixture}
      projectName="TEST AI SPRINT 3"
      workspaceId={workspaceId}
    />,
  );
  return onApply;
};

describe("AIProjectChangeReview", () => {
  it("renders clear before and editable after values", () => {
    renderReview();

    expect(screen.getByText("3 sur 3 sélectionnées")).toBeInTheDocument();
    expect(screen.getByText("API authentication")).toBeInTheDocument();
    expect(screen.getAllByText("Moyenne").length).toBeGreaterThan(0);
    expect(
      screen.getByLabelText("Nouvelle valeur priorité pour API authentication"),
    ).toHaveValue("high");
    expect(
      screen.getByLabelText("Nouvelle valeur échéance pour API authentication"),
    ).toHaveValue("2026-09-27");
  });

  it("submits every selected reviewed value only after confirmation", async () => {
    const user = userEvent.setup();
    const onApply = renderReview();
    await user.click(
      screen.getByLabelText("Inclure les modifications de API payments"),
    );
    await user.selectOptions(
      screen.getByLabelText("Nouvelle valeur priorité pour API authentication"),
      "urgent",
    );

    expect(screen.getByText("2 sur 3 sélectionnées")).toBeInTheDocument();
    const apply = screen.getByRole("button", {
      name: "Appliquer les modifications",
    });
    await waitFor(() => {
      expect(apply).toBeEnabled();
    });
    await user.click(apply);
    expect(
      screen.getByText(
        /Vous allez modifier 2 tâches dans le projet « TEST AI SPRINT 3 »/,
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByText("2 sur 3 sélectionnées")).toBeInTheDocument();

    await user.click(apply);
    await user.click(
      screen.getByRole("button", { name: "Confirmer et modifier" }),
    );
    await waitFor(() => {
      expect(onApply).toHaveBeenCalledTimes(1);
    });
    const request = onApply.mock.calls[0]?.[0];
    expect(request?.idempotency_key).toBe(idempotencyKey);
    expect(request?.source_change_count).toBe(3);
    expect(request?.changes).toHaveLength(2);
    expect(request?.changes.map((change) => change.task_id)).toEqual([
      "50000000-0000-4000-8000-000000000001",
      "50000000-0000-4000-8000-000000000003",
    ]);
    expect(request?.changes[0]?.after.priority).toBe("urgent");
    expect(request?.changes[0]?.changed_fields).toEqual([
      "priority",
      "due_date",
    ]);
  });

  it("renders a dedicated stale-data conflict", () => {
    renderReview(
      new ApiError("Une erreur inattendue est survenue.", 409, {
        detail: { code: "AI_CHANGE_CONFLICT", conflicts: [] },
      }),
    );

    expect(
      screen.getByText(/Une tâche a changé depuis l’analyse/),
    ).toBeInTheDocument();
  });
});
