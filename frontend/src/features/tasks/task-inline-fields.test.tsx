import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/api/client";
import {
  InlineTaskPriority,
  InlineTaskStatus,
  InlineTaskTitle,
} from "@/features/tasks/task-inline-fields";
import { taskFixture } from "@/test/resource-fixtures";

describe("task inline fields", () => {
  it("saves a trimmed title with Enter", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <InlineTaskTitle canManage onUpdate={onUpdate} task={taskFixture} />,
    );

    await user.click(screen.getByTitle("Modifier le titre"));
    const input = screen.getByLabelText("Titre de la tâche");
    await user.clear(input);
    await user.type(input, "  Nouveau titre{Enter}");

    expect(onUpdate).toHaveBeenCalledWith(taskFixture, {
      title: "Nouveau titre",
    });
  });

  it("cancels title editing with Escape without saving", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <InlineTaskTitle canManage onUpdate={onUpdate} task={taskFixture} />,
    );

    await user.click(screen.getByTitle("Modifier le titre"));
    await user.type(screen.getByLabelText("Titre de la tâche"), " changé");
    await user.keyboard("{Escape}");

    expect(onUpdate).not.toHaveBeenCalled();
    expect(screen.getByText(taskFixture.title)).toBeInTheDocument();
  });

  it("does not save an unchanged title", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <InlineTaskTitle canManage onUpdate={onUpdate} task={taskFixture} />,
    );

    await user.click(screen.getByTitle("Modifier le titre"));
    await user.keyboard("{Enter}");

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("updates status and priority with the fixed backend values", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <>
        <InlineTaskStatus canManage onUpdate={onUpdate} task={taskFixture} />
        <InlineTaskPriority canManage onUpdate={onUpdate} task={taskFixture} />
      </>,
    );

    await user.selectOptions(
      screen.getByLabelText(`Statut de ${taskFixture.title}`),
      "in_progress",
    );
    await user.selectOptions(
      screen.getByLabelText(`Priorité de ${taskFixture.title}`),
      "urgent",
    );

    expect(onUpdate).toHaveBeenNthCalledWith(1, taskFixture, {
      status: "in_progress",
    });
    expect(onUpdate).toHaveBeenNthCalledWith(2, taskFixture, {
      priority: "urgent",
    });
  });

  it("shows an API failure and leaves the control available", async () => {
    const user = userEvent.setup();
    const onUpdate = vi
      .fn()
      .mockRejectedValue(new ApiError("Modification refusée.", 403));
    render(
      <InlineTaskPriority canManage onUpdate={onUpdate} task={taskFixture} />,
    );

    const select = screen.getByLabelText(`Priorité de ${taskFixture.title}`);
    await user.selectOptions(select, "high");

    expect(
      await screen.findByText("Modification refusée."),
    ).toBeInTheDocument();
    expect(select).toBeEnabled();
  });

  it("renders values without editing controls for viewers", () => {
    const onUpdate = vi.fn();
    render(
      <>
        <InlineTaskTitle
          canManage={false}
          onUpdate={onUpdate}
          task={taskFixture}
        />
        <InlineTaskStatus
          canManage={false}
          onUpdate={onUpdate}
          task={taskFixture}
        />
        <InlineTaskPriority
          canManage={false}
          onUpdate={onUpdate}
          task={taskFixture}
        />
      </>,
    );

    expect(screen.queryByTitle("Modifier le titre")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByText("À faire")).toBeInTheDocument();
    expect(screen.getByText("Moyenne")).toBeInTheDocument();
  });
});
