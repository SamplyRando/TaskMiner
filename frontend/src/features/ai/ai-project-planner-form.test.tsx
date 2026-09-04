import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AIProjectPlannerForm } from "@/features/ai/ai-project-planner-form";
import { projectFixture, workspaceFixture } from "@/test/resource-fixtures";

const baseProps = {
  activeWorkspaceId: null,
  error: null,
  isPending: false,
  isProjectsError: false,
  isProjectsPending: false,
  isWorkspacesPending: false,
  onSubmit: vi.fn(() => Promise.resolve()),
  onWorkspaceChange: vi.fn(),
  projects: [projectFixture],
  workspaces: [workspaceFixture],
};

describe("AIProjectPlannerForm", () => {
  it("prefills a prompt example without starting generation", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(() => Promise.resolve());
    render(<AIProjectPlannerForm {...baseProps} onSubmit={onSubmit} />);

    await user.click(
      screen.getByRole("button", {
        name: "Créer un plan de lancement pour une application mobile en 8 semaines.",
      }),
    );

    expect(screen.getByLabelText("Brief du projet")).toHaveValue(
      "Créer un plan de lancement pour une application mobile en 8 semaines.",
    );
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByText("Commencer avec un exemple")).toBeNull();
  });

  it("requires a workspace and a meaningful prompt", async () => {
    const user = userEvent.setup();
    render(<AIProjectPlannerForm {...baseProps} />);
    const submit = screen.getByRole("button", { name: "Générer le plan" });

    expect(submit).toBeDisabled();
    await user.selectOptions(
      screen.getByLabelText("Workspace"),
      workspaceFixture.id,
    );
    await user.type(screen.getByLabelText("Brief du projet"), "Court");

    expect(submit).toBeDisabled();
    expect(
      await screen.findByText(
        "Décrivez votre projet en au moins 10 caractères.",
      ),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Brief du projet"));
    await user.type(
      screen.getByLabelText("Brief du projet"),
      "Préparer un plan de lancement complet.",
    );

    expect(submit).toBeEnabled();
  });

  it("disables generation when the selected workspace quota is known exhausted", async () => {
    const user = userEvent.setup();
    render(
      <AIProjectPlannerForm
        {...baseProps}
        quotaReachedWorkspaceId={workspaceFixture.id}
      />,
    );

    await user.selectOptions(
      screen.getByLabelText("Workspace"),
      workspaceFixture.id,
    );
    await user.type(
      screen.getByLabelText("Brief du projet"),
      "Préparer un plan de lancement complet.",
    );

    expect(screen.getByText(/quota mensuel TaskMiner AI/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Générer le plan" }),
    ).toBeDisabled();
  });
});
