import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AIProjectChangeForm } from "@/features/ai/ai-project-change-form";
import { projectFixture, workspaceFixture } from "@/test/resource-fixtures";

const props = {
  error: null,
  initialValues: { workspaceId: "", projectId: "", instruction: "" },
  isPending: false,
  isProjectsError: false,
  isProjectsPending: false,
  isWorkspacesPending: false,
  onSubmit: vi.fn(() => Promise.resolve()),
  onWorkspaceChange: vi.fn(),
  projects: [projectFixture],
  workspaces: [workspaceFixture],
};

describe("AIProjectChangeForm", () => {
  it("prefills an instruction example without starting analysis", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(() => Promise.resolve());
    render(<AIProjectChangeForm {...props} onSubmit={onSubmit} />);

    await user.click(
      screen.getByRole("button", {
        name: "Réorganiser ce projet pour terminer une semaine plus tôt.",
      }),
    );

    expect(screen.getByLabelText("Instruction")).toHaveValue(
      "Réorganiser ce projet pour terminer une semaine plus tôt.",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("requires a workspace, an existing project and a meaningful instruction", async () => {
    const user = userEvent.setup();
    render(<AIProjectChangeForm {...props} />);
    const submit = screen.getByRole("button", {
      name: "Analyser les modifications",
    });

    expect(submit).toBeDisabled();
    await user.selectOptions(
      screen.getByLabelText("Workspace"),
      workspaceFixture.id,
    );
    await user.selectOptions(
      screen.getByLabelText("Projet"),
      projectFixture.id,
    );
    await user.type(screen.getByLabelText("Instruction"), "Court");
    expect(submit).toBeDisabled();

    await user.clear(screen.getByLabelText("Instruction"));
    await user.type(
      screen.getByLabelText("Instruction"),
      "Décale toutes les tâches API d’une semaine.",
    );
    expect(submit).toBeEnabled();
  });

  it("shows an accessible pending action", () => {
    render(
      <AIProjectChangeForm
        {...props}
        initialValues={{
          workspaceId: workspaceFixture.id,
          projectId: projectFixture.id,
          instruction: "Décale toutes les tâches API d’une semaine.",
        }}
        isPending
      />,
    );

    const submit = screen.getByRole("button", {
      name: "Analyse des modifications en cours",
    });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute("aria-busy", "true");
  });

  it("disables analysis when the selected workspace quota is exhausted", () => {
    render(
      <AIProjectChangeForm
        {...props}
        initialValues={{
          workspaceId: workspaceFixture.id,
          projectId: projectFixture.id,
          instruction: "Décale toutes les tâches API d’une semaine.",
        }}
        quotaReachedWorkspaceId={workspaceFixture.id}
      />,
    );

    expect(screen.getByText(/quota mensuel TaskMiner AI/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Analyser les modifications" }),
    ).toBeDisabled();
  });
});
