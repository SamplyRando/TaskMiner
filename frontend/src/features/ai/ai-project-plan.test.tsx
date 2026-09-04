import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/api/client";
import { AIProjectPlan } from "@/features/ai/ai-project-plan";
import { aiPlanFixture } from "@/test/ai-fixtures";
import { projectId, workspaceId } from "@/test/resource-fixtures";
import type { AIApplyProjectPlanRequest } from "@/types/ai";
import type { AssignableWorkspaceMember } from "@/types/workspace";

const idempotencyKey = "30000000-0000-4000-8000-000000000001";
const adaId = "00000000-0000-4000-8000-000000000010";
const graceId = "00000000-0000-4000-8000-000000000020";
const members: AssignableWorkspaceMember[] = [
  {
    email: "ada@example.com",
    full_name: "Ada Lovelace",
    role: "owner",
    user_id: adaId,
  },
  {
    email: "grace@example.com",
    full_name: "Grace Hopper",
    role: "member",
    user_id: graceId,
  },
];

const renderReview = (
  overrides: Partial<ComponentProps<typeof AIProjectPlan>> = {},
) => {
  const onApply = vi.fn<(request: AIApplyProjectPlanRequest) => Promise<void>>(
    () => Promise.resolve(),
  );
  render(
    <AIProjectPlan
      error={null}
      existingProjectId={null}
      existingProjectName={null}
      idempotencyKey={idempotencyKey}
      initialReviewValues={null}
      isPending={false}
      onApply={onApply}
      onReviewChange={() => undefined}
      plan={aiPlanFixture}
      suggestedProjectName="Mobile launch"
      workspaceId={workspaceId}
      {...overrides}
    />,
  );
  return { onApply };
};

describe("AIProjectPlan review", () => {
  it("keeps task cards compact and supports expand/collapse controls", async () => {
    const user = userEvent.setup();
    renderReview();

    expect(screen.getAllByLabelText("Titre")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Tout développer" }));
    expect(screen.getAllByLabelText("Titre")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Tout réduire" }));
    expect(screen.queryByLabelText("Titre")).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Modifier la tâche 01" }),
    );
    expect(screen.getByLabelText("Titre")).toHaveValue("Define launch scope");
  });

  it("shows dependencies by task title and explicitly removes excluded references", async () => {
    const user = userEvent.setup();
    const { onApply } = renderReview();

    expect(screen.getByText("Dépend de")).toBeInTheDocument();
    expect(screen.getAllByText("Define launch scope").length).toBeGreaterThan(
      1,
    );
    await user.clear(screen.getByLabelText("Titre"));
    await user.type(screen.getByLabelText("Titre"), "Cadrer le lancement");
    expect(screen.getAllByText("Cadrer le lancement").length).toBeGreaterThan(
      1,
    );
    await user.click(screen.getByLabelText("Inclure la tâche 1"));
    expect(
      screen.getByText(/désélectionnée.*référence sera retirée/i),
    ).toBeInTheDocument();
    const apply = screen.getByRole("button", { name: "Appliquer le plan" });
    await waitFor(() => {
      expect(apply).toBeEnabled();
    });
    await user.click(apply);
    await user.click(
      screen.getByRole("button", { name: "Confirmer et créer" }),
    );

    await waitFor(() => {
      expect(onApply).toHaveBeenCalledOnce();
    });
    expect(onApply.mock.calls[0]?.[0].tasks[0]?.depends_on).toEqual([]);
  });

  it("shows and edits a safe assignment suggestion by name or email", async () => {
    const user = userEvent.setup();
    const { onApply } = renderReview({
      currentUserId: adaId,
      members,
      plan: {
        ...aiPlanFixture,
        tasks: aiPlanFixture.tasks.map((task, index) => ({
          ...task,
          suggested_assignee_id: index === 0 ? adaId : null,
        })),
      },
    });

    expect(screen.getAllByText("Ada Lovelace").length).toBeGreaterThan(0);
    const combobox = screen.getByRole("combobox", {
      name: "Assignation suggérée",
    });
    await user.type(combobox, "grace@example.com");
    await user.click(
      screen.getByRole("option", {
        name: "Grace Hopper — grace@example.com",
      }),
    );
    expect(screen.getAllByText("Grace Hopper").length).toBeGreaterThan(0);
    expect(screen.queryByText(graceId)).not.toBeInTheDocument();
    const apply = screen.getByRole("button", { name: "Appliquer le plan" });
    await waitFor(() => {
      expect(apply).toBeEnabled();
    });
    await user.click(apply);
    await user.click(
      screen.getByRole("button", { name: "Confirmer et créer" }),
    );
    await waitFor(() => {
      expect(onApply).toHaveBeenCalledOnce();
    });
    expect(onApply.mock.calls[0]?.[0].tasks[0]?.assigned_user_id).toBe(graceId);
  });

  it("renders milestones as an AI suggestion timeline with selected task counts", () => {
    renderReview();

    expect(screen.getByText("Progression proposée")).toBeInTheDocument();
    expect(screen.getByText("Suggestion IA")).toBeInTheDocument();
    expect(screen.getByText("0 tâche sélectionnée")).toBeInTheDocument();
  });

  it("prevents apply when a dependency reference is incoherent", () => {
    renderReview({
      plan: {
        ...aiPlanFixture,
        tasks: aiPlanFixture.tasks.map((task, index) =>
          index === 0 ? { ...task, depends_on: [2] } : task,
        ),
      },
    });

    expect(screen.getByText(/dépendance.*incohérente/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Appliquer le plan" }),
    ).toBeDisabled();
  });

  it("selects, edits and counts only approved task suggestions", async () => {
    const user = userEvent.setup();
    renderReview();

    expect(screen.getByText("2 sur 2 sélectionnées")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Inclure la tâche 2"));
    expect(screen.getByText("1 sur 2 sélectionnées")).toBeInTheDocument();

    const firstTitle = screen.getAllByLabelText(/Titre/)[0];
    const firstPriority = screen.getAllByLabelText("Priorité")[0];
    const firstDate = screen.getAllByLabelText("Échéance")[0];
    if (!firstTitle || !firstPriority || !firstDate) {
      throw new Error("Expected first task review fields");
    }
    await user.clear(firstTitle);
    await user.type(firstTitle, "Edited launch scope");
    await user.selectOptions(firstPriority, "urgent");
    await user.clear(firstDate);
    await user.type(firstDate, "2026-08-25");

    expect(firstTitle).toHaveValue("Edited launch scope");
    expect(firstPriority).toHaveValue("urgent");
    expect(firstDate).toHaveValue("2026-08-25");
  });

  it("requires a valid project name and at least one selected task", async () => {
    const user = userEvent.setup();
    renderReview();
    const applyButton = screen.getByRole("button", {
      name: "Appliquer le plan",
    });
    await waitFor(() => {
      expect(applyButton).toBeEnabled();
    });

    await user.clear(screen.getByLabelText("Nom du projet"));
    expect(applyButton).toBeDisabled();
    await user.type(screen.getByLabelText("Nom du projet"), "Approved project");
    await user.click(screen.getByLabelText("Inclure la tâche 1"));
    await user.click(screen.getByLabelText("Inclure la tâche 2"));

    expect(applyButton).toBeDisabled();
    expect(
      screen.getByText("Sélectionnez au moins une tâche."),
    ).toBeInTheDocument();
  });

  it("shows a locked existing project without recreation fields", () => {
    renderReview({
      existingProjectId: projectId,
      existingProjectName: "Existing project",
    });

    expect(screen.getByLabelText("Projet existant")).toHaveValue(
      "Existing project",
    );
    expect(screen.queryByLabelText("Nom du projet")).toBeNull();
  });

  it("requires confirmation and cancel performs no request", async () => {
    const user = userEvent.setup();
    const { onApply } = renderReview();
    const applyButton = screen.getByRole("button", {
      name: "Appliquer le plan",
    });
    await waitFor(() => {
      expect(applyButton).toBeEnabled();
    });
    await user.click(applyButton);

    expect(
      screen.getByRole("heading", { name: "Confirmer l’application du plan" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onApply).not.toHaveBeenCalled();
  });

  it("submits edited selected tasks once with a stable idempotency key", async () => {
    const user = userEvent.setup();
    const { onApply } = renderReview();
    await user.click(screen.getByLabelText("Inclure la tâche 2"));
    const firstTitle = screen.getAllByLabelText(/Titre/)[0];
    if (!firstTitle) throw new Error("Expected first title field");
    await user.clear(firstTitle);
    await user.type(firstTitle, "Approved edited scope");
    const applyButton = screen.getByRole("button", {
      name: "Appliquer le plan",
    });
    await waitFor(() => {
      expect(applyButton).toBeEnabled();
    });
    await user.click(applyButton);
    const confirm = screen.getByRole("button", { name: "Confirmer et créer" });
    await user.dblClick(confirm);

    await waitFor(() => {
      expect(onApply).toHaveBeenCalledTimes(1);
    });
    const request = onApply.mock.calls[0]?.[0];
    expect(request?.idempotency_key).toBe(idempotencyKey);
    expect(request?.project).toEqual(
      expect.objectContaining({ name: "Mobile launch" }),
    );
    expect(request?.project_id).toBeNull();
    expect(request?.source_task_count).toBe(2);
    expect(request?.tasks).toHaveLength(1);
    expect(request?.tasks[0]?.title).toBe("Approved edited scope");
    expect(request?.workspace_id).toBe(workspaceId);
  });

  it("keeps the edited draft and retry key visible after an API error", async () => {
    const user = userEvent.setup();
    const error = new ApiError("Insufficient permissions.", 403, {
      detail: "Insufficient permissions.",
    });
    renderReview({ error });
    const title = screen.getAllByLabelText(/Titre/)[0];
    if (!title) throw new Error("Expected title field");
    await user.clear(title);
    await user.type(title, "Preserved after failure");

    expect(
      screen.getByDisplayValue("Preserved after failure"),
    ).toBeInTheDocument();
    expect(screen.getByText("Insufficient permissions.")).toBeInTheDocument();
  });

  it("explains when a suggested assignee is no longer available", () => {
    renderReview({ error: new ApiError("Assignee not found.", 404) });

    expect(
      screen.getByText(/membre assigné n’est plus disponible/i),
    ).toBeInTheDocument();
  });

  it("preserves edits and reuses the same idempotency key on a safe retry", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn<
      (request: AIApplyProjectPlanRequest) => Promise<void>
    >(() => Promise.reject(new Error("Network unavailable")));
    renderReview({ onApply });
    const title = screen.getAllByLabelText(/Titre/)[0];
    if (!title) throw new Error("Expected title field");
    await user.clear(title);
    await user.type(title, "Retry-safe edited task");
    const applyButton = screen.getByRole("button", {
      name: "Appliquer le plan",
    });
    await waitFor(() => {
      expect(applyButton).toBeEnabled();
    });
    await user.click(applyButton);

    const confirm = screen.getByRole("button", { name: "Confirmer et créer" });
    await user.click(confirm);
    await waitFor(() => {
      expect(onApply).toHaveBeenCalledTimes(1);
    });
    await user.click(confirm);
    await waitFor(() => {
      expect(onApply).toHaveBeenCalledTimes(2);
    });

    expect(onApply.mock.calls[0]?.[0].idempotency_key).toBe(idempotencyKey);
    expect(onApply.mock.calls[1]?.[0].idempotency_key).toBe(idempotencyKey);
    expect(
      screen.getByDisplayValue("Retry-safe edited task"),
    ).toBeInTheDocument();
  });

  it("applies tasks to an existing project without a creation payload", async () => {
    const user = userEvent.setup();
    const { onApply } = renderReview({
      existingProjectId: projectId,
      existingProjectName: "Existing project",
    });
    const applyButton = screen.getByRole("button", {
      name: "Appliquer le plan",
    });
    await waitFor(() => {
      expect(applyButton).toBeEnabled();
    });
    await user.click(applyButton);
    await user.click(
      screen.getByRole("button", { name: "Confirmer et créer" }),
    );

    await waitFor(() => {
      expect(onApply).toHaveBeenCalledTimes(1);
    });
    expect(onApply.mock.calls[0]?.[0].project_id).toBe(projectId);
    expect(onApply.mock.calls[0]?.[0].project).toBeNull();
  });
});
