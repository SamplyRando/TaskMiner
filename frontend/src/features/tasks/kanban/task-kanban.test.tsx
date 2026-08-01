import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  performTaskMove,
  resolveTaskMove,
} from "@/features/tasks/kanban/task-kanban-move";
import { TaskKanban } from "@/features/tasks/kanban/task-kanban";
import { renderWithQuery } from "@/test/query-wrapper";
import { projectFixture, taskFixture, userId } from "@/test/resource-fixtures";
import type { Task } from "@/types/task";

const inProgressTask: Task = {
  ...taskFixture,
  id: "task-in-progress",
  status: "in_progress",
  title: "Tâche en cours",
};
const doneTask: Task = {
  ...taskFixture,
  assigned_user_id: userId,
  due_date: "2026-08-12T10:00:00Z",
  id: "task-done",
  priority: "urgent",
  status: "done",
  title: "Tâche terminée",
};
const tasks: Task[] = [taskFixture, inProgressTask, doneTask];

const renderKanban = (
  overrides: Partial<React.ComponentProps<typeof TaskKanban>> = {},
) =>
  renderWithQuery(
    <TaskKanban
      canManageTasks
      currentUserId={userId}
      isLoading={false}
      onStatusChange={vi.fn().mockResolvedValue(undefined)}
      projects={[projectFixture]}
      statusFilter=""
      tasks={tasks}
      {...overrides}
    />,
  );

const desktopMatchMedia = window.matchMedia.bind(window);

describe("TaskKanban", () => {
  afterEach(() => {
    window.matchMedia = desktopMatchMedia;
  });

  it("generates one column for every backend task status", () => {
    renderKanban();

    expect(
      screen.getByRole("region", { name: /À faire, 1 tâche/ }),
    ).toBeVisible();
    expect(
      screen.getByRole("region", { name: /En cours, 1 tâche/ }),
    ).toBeVisible();
    expect(
      screen.getByRole("region", { name: /Terminée, 1 tâche/ }),
    ).toBeVisible();
    expect(screen.getAllByText(projectFixture.name)).toHaveLength(3);
    expect(screen.getByText("Urgente")).toBeInTheDocument();
    expect(screen.getByText("Assignée à vous")).toBeInTheDocument();
  });

  it("shows a loading skeleton", () => {
    renderKanban({ isLoading: true });

    expect(
      screen.getByRole("status", { name: "Chargement du Kanban" }),
    ).toBeInTheDocument();
  });

  it("shows an empty state", () => {
    renderKanban({ tasks: [] });

    expect(screen.getByText("Aucune tâche à afficher")).toBeInTheDocument();
  });

  it("applies the same status filter as the list", () => {
    renderKanban({ statusFilter: "done", tasks: [doneTask] });

    expect(screen.getByRole("region", { name: /Terminée/ })).toBeVisible();
    expect(screen.queryByRole("region", { name: /À faire/ })).toBeNull();
  });

  it("prevents dragging without task management permission", () => {
    renderKanban({ canManageTasks: false });

    expect(
      screen.getAllByText(
        "Vous ne disposez pas de la permission de modifier cette tâche.",
      ),
    ).toHaveLength(3);
    expect(screen.getByText(taskFixture.title).closest("article")).toHaveClass(
      "cursor-not-allowed",
    );
    expect(
      resolveTaskMove(tasks, taskFixture.id, { status: "done" }, false),
    ).toBeNull();
  });

  it("supports a one-column mobile navigation", async () => {
    const user = userEvent.setup();
    window.matchMedia = vi
      .fn()
      .mockImplementation((query: string): MediaQueryList => ({
        addEventListener: () => undefined,
        addListener: () => undefined,
        dispatchEvent: () => false,
        matches: query === "(max-width: 639px)",
        media: query,
        onchange: null,
        removeEventListener: () => undefined,
        removeListener: () => undefined,
      }));
    renderKanban();

    expect(
      screen.getByRole("navigation", {
        name: "Navigation entre les colonnes Kanban",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("À faire · 1/3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Colonne suivante" }));
    expect(screen.getByText("En cours · 2/3")).toBeInTheDocument();
  });

  it("commits a valid drag and returns a success toast", async () => {
    const onStatusChange = vi.fn().mockResolvedValue(undefined);
    const move = resolveTaskMove(
      tasks,
      taskFixture.id,
      { status: "done" },
      true,
    );
    expect(move).not.toBeNull();
    if (!move) {
      throw new Error("Expected a valid task move");
    }

    const notice = await performTaskMove(move, onStatusChange);

    expect(onStatusChange).toHaveBeenCalledWith(taskFixture, "done");
    expect(notice.kind).toBe("success");
    expect(notice.message).toContain("Terminée");
  });

  it("reports a failed drag so React Query can roll it back", async () => {
    const onStatusChange = vi.fn().mockRejectedValue(new Error("Forbidden"));
    const move = resolveTaskMove(
      tasks,
      taskFixture.id,
      { status: "done" },
      true,
    );
    expect(move).not.toBeNull();
    if (!move) {
      throw new Error("Expected a valid task move");
    }

    const notice = await performTaskMove(move, onStatusChange);

    expect(notice.kind).toBe("error");
    expect(notice.message).toContain("données ont été restaurées");
  });
});
