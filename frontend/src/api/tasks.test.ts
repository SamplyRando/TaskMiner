import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import { listAllTasks, updateTask } from "@/api/tasks";
import { taskFixture } from "@/test/resource-fixtures";

describe("tasks API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads every backend page for the Kanban", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      ...taskFixture,
      id: `task-${String(index)}`,
    }));
    const secondPage = [
      { ...taskFixture, id: "task-100", status: "done" as const },
    ];
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValueOnce({
        data: { items: firstPage, limit: 100, skip: 0, total: 101 },
      })
      .mockResolvedValueOnce({
        data: { items: secondPage, limit: 100, skip: 100, total: 101 },
      });

    const result = await listAllTasks({
      sort: "-created_at",
      workspace_id: "workspace-1",
    });

    expect(result.items).toHaveLength(101);
    expect(result.total).toBe(101);
    expect(get).toHaveBeenNthCalledWith(1, "/tasks", {
      params: {
        limit: 100,
        skip: 0,
        sort: "-created_at",
        workspace_id: "workspace-1",
      },
    });
    expect(get).toHaveBeenNthCalledWith(2, "/tasks", {
      params: {
        limit: 100,
        skip: 100,
        sort: "-created_at",
        workspace_id: "workspace-1",
      },
    });
  });

  it("sends a partial status update to the existing task endpoint", async () => {
    const patch = vi
      .spyOn(apiClient, "patch")
      .mockResolvedValue({ data: { ...taskFixture, status: "done" } });

    await updateTask(taskFixture.id, { status: "done" });

    expect(patch).toHaveBeenCalledWith(`/tasks/${taskFixture.id}`, {
      status: "done",
    });
  });
});
