import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { AIApplySuccess } from "@/features/ai/ai-apply-success";
import { aiApplyFixture } from "@/test/ai-fixtures";
import type { AIApplyProjectPlanResponse } from "@/types/ai";

function renderSuccess(
  onCreateNewPlan = () => undefined,
  result: AIApplyProjectPlanResponse = aiApplyFixture,
) {
  render(
    <MemoryRouter initialEntries={["/app/ai"]}>
      <Routes>
        <Route
          element={
            <AIApplySuccess
              onCreateNewPlan={onCreateNewPlan}
              projectName="Mobile launch"
              result={result}
            />
          }
          path="/app/ai"
        />
        <Route element={<p>Projects destination</p>} path="/app/projects" />
        <Route element={<p>Tasks destination</p>} path="/app/tasks" />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AIApplySuccess", () => {
  it("opens the projects route", async () => {
    const user = userEvent.setup();
    renderSuccess();

    await user.click(screen.getByRole("button", { name: "Voir les projets" }));

    expect(screen.getByText("Projects destination")).toBeInTheDocument();
  });

  it("opens the tasks route", async () => {
    const user = userEvent.setup();
    renderSuccess();

    await user.click(screen.getByRole("button", { name: "Voir les tâches" }));

    expect(screen.getByText("Tasks destination")).toBeInTheDocument();
  });

  it("shows the target project and starts a new plan explicitly", async () => {
    const user = userEvent.setup();
    const onCreateNewPlan = vi.fn();
    renderSuccess(onCreateNewPlan);

    expect(screen.getByText(/Mobile launch/)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Créer un nouveau plan" }),
    );

    expect(onCreateNewPlan).toHaveBeenCalledOnce();
  });

  it("distinguishes adding tasks from modifying an existing project", () => {
    renderSuccess(() => undefined, {
      ...aiApplyFixture,
      created_project: false,
      created_task_count: 6,
    });

    expect(
      screen.getByText(
        "6 tâches ont été ajoutées au projet « Mobile launch ».",
      ),
    ).toBeInTheDocument();
  });

  it("reports assignments that were actually applied", () => {
    renderSuccess(() => undefined, {
      ...aiApplyFixture,
      created_assignment_count: 2,
    });

    expect(screen.getByText("2 assignations appliquées.")).toBeInTheDocument();
  });
});
