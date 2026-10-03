import { apiClient } from "@/api/client";
import type { CommentInput, TaskComment } from "@/types/comment";

export const listTaskComments = async (
  taskId: string,
): Promise<TaskComment[]> => {
  const response = await apiClient.get<TaskComment[]>(
    `/tasks/${taskId}/comments`,
  );
  return response.data;
};

export const createTaskComment = async (
  taskId: string,
  data: CommentInput,
): Promise<TaskComment> => {
  const response = await apiClient.post<TaskComment>(
    `/tasks/${taskId}/comments`,
    data,
  );
  return response.data;
};

export const updateTaskComment = async (
  commentId: string,
  data: CommentInput,
): Promise<TaskComment> => {
  const response = await apiClient.patch<TaskComment>(
    `/comments/${commentId}`,
    data,
  );
  return response.data;
};

export const deleteTaskComment = async (commentId: string): Promise<void> => {
  await apiClient.delete(`/comments/${commentId}`);
};
