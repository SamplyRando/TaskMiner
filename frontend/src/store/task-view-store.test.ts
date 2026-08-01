import { beforeEach, describe, expect, it } from "vitest";

import { useTaskViewStore } from "@/store/task-view-store";

describe("task view store", () => {
  beforeEach(() => {
    localStorage.clear();
    useTaskViewStore.setState({ mode: "list" });
  });

  it("persists the last selected task view", () => {
    useTaskViewStore.getState().setMode("kanban");

    expect(useTaskViewStore.getState().mode).toBe("kanban");
    expect(localStorage.getItem("taskminer-task-view")).toContain("kanban");
  });
});
