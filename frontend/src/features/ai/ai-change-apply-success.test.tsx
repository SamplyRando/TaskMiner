import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { AIChangeApplySuccess } from "@/features/ai/ai-change-apply-success";
import { aiChangeApplyFixture } from "@/test/ai-fixtures";

function renderSuccess(onNewInstruction = () => undefined) {
  return render(
    <MemoryRouter initialEntries={["/app/ai"]}>
      <Routes>
        <Route
          element={
            <AIChangeApplySuccess
              onNewInstruction={onNewInstruction}
              projectName="TEST AI SPRINT 3"
              result={aiChangeApplyFixture}
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

describe("AIChangeApplySuccess", () => {
  it("reports the exact result and starts a new instruction explicitly", async () => {
    const user = userEvent.setup();
    const onNewInstruction = vi.fn();
    renderSuccess(onNewInstruction);

    expect(screen.getByText(/TEST AI SPRINT 3/)).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" &&
          element.textContent.includes("2 tâches modifiées"),
      ),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Nouvelle instruction" }),
    );

    expect(onNewInstruction).toHaveBeenCalledOnce();
  });

  it("navigates to the existing tasks and projects routes", async () => {
    const user = userEvent.setup();
    const firstRender = renderSuccess();

    await user.click(screen.getByRole("button", { name: "Voir les tâches" }));
    expect(screen.getByText("Tasks destination")).toBeInTheDocument();

    firstRender.unmount();
    renderSuccess();
    await user.click(screen.getByRole("button", { name: "Voir les projets" }));
    expect(screen.getByText("Projects destination")).toBeInTheDocument();
  });
});
