import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types/pagination";
import type {
  Task,
  TaskInput,
  TaskKanbanParams,
  TaskListParams,
  TaskUpdate,
} from "@/types/task";

export const listTasks = async (
  params: TaskListParams,
): Promise<PaginatedResponse<Task>> => {
  const response = await apiClient.get<PaginatedResponse<Task>>("/tasks", {
    params,
  });
  return response.data;
};

export const createTask = async (
  projectId: string,
  data: TaskInput,
): Promise<Task> => {
  const response = await apiClient.post<Task>(
    `/projects/${projectId}/tasks`,
    data,
  );
  return response.data;
};

export const updateTask = async (
  taskId: string,
  data: TaskUpdate,
): Promise<Task> => {
  const response = await apiClient.patch<Task>(`/tasks/${taskId}`, data);
  return response.data;
};

export const listAllTasks = async (
  params: TaskKanbanParams,
): Promise<PaginatedResponse<Task>> => {
  const pageSize = 100;
  const firstPage = await listTasks({
    ...params,
    limit: pageSize,
    skip: 0,
  });
  const items = [...firstPage.items];
  const { total } = firstPage;

  while (items.length < total) {
    const page = await listTasks({
      ...params,
      limit: pageSize,
      skip: items.length,
    });
    items.push(...page.items);

    if (page.items.length === 0) {
      break;
    }
  }

  return {
    items,
    limit: pageSize,
    skip: 0,
    total,
  };
};

export const deleteTask = async (taskId: string): Promise<void> => {
  await apiClient.delete(`/tasks/${taskId}`);
};

export const assignTask = async (
  taskId: string,
  assignedUserId: string,
): Promise<Task> => {
  const response = await apiClient.patch<Task>(`/tasks/${taskId}/assign`, {
    assigned_user_id: assignedUserId,
  });
  return response.data;
};

export const unassignTask = async (taskId: string): Promise<void> => {
  await apiClient.delete(`/tasks/${taskId}/assign`);
};
