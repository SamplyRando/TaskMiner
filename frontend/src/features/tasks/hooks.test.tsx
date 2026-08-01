import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listAllTasks, updateTask } from "@/api/tasks";
import {
  taskKeys,
  useKanbanTasks,
  useUpdateTask,
} from "@/features/tasks/hooks";
import type { PaginatedResponse } from "@/types/pagination";
import { taskFixture } from "@/test/resource-fixtures";
import type { Task } from "@/types/task";

vi.mock("@/api/tasks", () => ({
  assignTask: vi.fn(),
  createTask: vi.fn(),
  deleteTask: vi.fn(),
  listAllTasks: vi.fn(),
  listTasks: vi.fn(),
  unassignTask: vi.fn(),
  updateTask: vi.fn(),
}));

const mockedListAllTasks = vi.mocked(listAllTasks);
const mockedUpdateTask = vi.mocked(updateTask);
const filters = { sort: "-created_at" as const, workspace_id: "workspace-1" };
const response: PaginatedResponse<Task> = {
  items: [taskFixture],
  limit: 100,
  skip: 0,
  total: 1,
};

const createHarness = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

describe("task query hooks", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads Kanban tasks with a dedicated React Query key", async () => {
    mockedListAllTasks.mockResolvedValue(response);
    const { wrapper } = createHarness();
    const { result } = renderHook(() => useKanbanTasks(filters), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual(response);
    expect(taskKeys.kanban(filters)).toEqual([
      "tasks",
      "list",
      "kanban",
      filters,
    ]);
  });

  it("updates the Kanban cache optimistically", async () => {
    let resolveUpdate: ((task: Task) => void) | undefined;
    mockedUpdateTask.mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    const { queryClient, wrapper } = createHarness();
    queryClient.setQueryData(taskKeys.kanban(filters), response);
    const { result } = renderHook(useUpdateTask, { wrapper });

    act(() => {
      result.current.mutate({
        data: { status: "done" },
        taskId: taskFixture.id,
      });
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<PaginatedResponse<Task>>(
        taskKeys.kanban(filters),
      );
      expect(cached?.items[0]?.status).toBe("done");
    });

    resolveUpdate?.({ ...taskFixture, status: "done" });
  });

  it("rolls the Kanban cache back when the API rejects the drag", async () => {
    mockedUpdateTask.mockRejectedValue(new Error("Update failed"));
    const { queryClient, wrapper } = createHarness();
    queryClient.setQueryData(taskKeys.kanban(filters), response);
    const { result } = renderHook(useUpdateTask, { wrapper });

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          data: { status: "done" },
          taskId: taskFixture.id,
        }),
      ).rejects.toThrow("Update failed");
    });

    const cached = queryClient.getQueryData<PaginatedResponse<Task>>(
      taskKeys.kanban(filters),
    );
    expect(cached?.items[0]?.status).toBe("todo");
  });
});
