import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  assignTask,
  createTask,
  deleteTask,
  listTasks,
  unassignTask,
  updateTask,
} from "@/api/tasks";
import type { PaginatedResponse } from "@/types/pagination";
import type { Task, TaskInput, TaskListParams } from "@/types/task";

export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (params: TaskListParams) => [...taskKeys.lists(), params] as const,
};

export const useTasks = (params: TaskListParams) =>
  useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => listTasks(params),
    placeholderData: keepPreviousData,
  });

type CreateTaskVariables = {
  projectId: string;
  data: TaskInput;
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data, projectId }: CreateTaskVariables) =>
      createTask(projectId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
};

type UpdateTaskVariables = {
  taskId: string;
  data: TaskInput;
};

type TaskQueriesSnapshot = [
  readonly unknown[],
  PaginatedResponse<Task> | undefined,
][];

const restoreTaskQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  snapshot: TaskQueriesSnapshot,
): void => {
  snapshot.forEach(([queryKey, data]) => {
    queryClient.setQueryData(queryKey, data);
  });
};

const optimisticallyUpdateTask = (
  queryClient: ReturnType<typeof useQueryClient>,
  taskId: string,
  updates: Partial<Task>,
): void => {
  queryClient.setQueriesData<PaginatedResponse<Task>>(
    { queryKey: taskKeys.lists() },
    (current) =>
      current
        ? {
            ...current,
            items: current.items.map((task) =>
              task.id === taskId ? { ...task, ...updates } : task,
            ),
          }
        : current,
  );
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data, taskId }: UpdateTaskVariables) =>
      updateTask(taskId, data),
    onMutate: async ({ data, taskId }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });
      const previous = queryClient.getQueriesData<PaginatedResponse<Task>>({
        queryKey: taskKeys.lists(),
      });
      optimisticallyUpdateTask(queryClient, taskId, data);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        restoreTaskQueries(queryClient, context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTask,
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });
      const previous = queryClient.getQueriesData<PaginatedResponse<Task>>({
        queryKey: taskKeys.lists(),
      });
      queryClient.setQueriesData<PaginatedResponse<Task>>(
        { queryKey: taskKeys.lists() },
        (current) =>
          current
            ? {
                ...current,
                items: current.items.filter((task) => task.id !== taskId),
                total: Math.max(0, current.total - 1),
              }
            : current,
      );
      return { previous };
    },
    onError: (_error, _taskId, context) => {
      if (context?.previous) {
        restoreTaskQueries(queryClient, context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
};

type AssignTaskVariables = {
  taskId: string;
  assignedUserId: string | null;
};

export const useAssignTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignedUserId, taskId }: AssignTaskVariables) =>
      assignedUserId
        ? assignTask(taskId, assignedUserId)
        : unassignTask(taskId).then(() => null),
    onMutate: async ({ assignedUserId, taskId }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });
      const previous = queryClient.getQueriesData<PaginatedResponse<Task>>({
        queryKey: taskKeys.lists(),
      });
      optimisticallyUpdateTask(queryClient, taskId, {
        assigned_user_id: assignedUserId,
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        restoreTaskQueries(queryClient, context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
};
