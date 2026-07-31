import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types/pagination";
import type { Task, TaskInput, TaskListParams } from "@/types/task";

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
  data: TaskInput,
): Promise<Task> => {
  const response = await apiClient.patch<Task>(`/tasks/${taskId}`, data);
  return response.data;
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
