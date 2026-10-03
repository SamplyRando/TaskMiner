import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createTaskComment,
  deleteTaskComment,
  listTaskComments,
  updateTaskComment,
} from "@/api/comments";
import type { CommentInput } from "@/types/comment";

export const commentKeys = {
  all: ["comments"] as const,
  list: (taskId: string) => [...commentKeys.all, "task", taskId] as const,
};

export const useTaskComments = (taskId: string | undefined, enabled: boolean) =>
  useQuery({
    enabled: enabled && Boolean(taskId),
    queryKey: commentKeys.list(taskId ?? ""),
    queryFn: () => listTaskComments(taskId ?? ""),
  });

type CreateCommentVariables = {
  taskId: string;
  data: CommentInput;
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, taskId }: CreateCommentVariables) =>
      createTaskComment(taskId, data),
    onSuccess: async (_comment, { taskId }) => {
      await queryClient.invalidateQueries({
        queryKey: commentKeys.list(taskId),
      });
    },
  });
};

type UpdateCommentVariables = {
  commentId: string;
  taskId: string;
  data: CommentInput;
};

export const useUpdateComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, data }: UpdateCommentVariables) =>
      updateTaskComment(commentId, data),
    onSuccess: async (_comment, { taskId }) => {
      await queryClient.invalidateQueries({
        queryKey: commentKeys.list(taskId),
      });
    },
  });
};

type DeleteCommentVariables = {
  commentId: string;
  taskId: string;
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId }: DeleteCommentVariables) =>
      deleteTaskComment(commentId),
    onSuccess: async (_result, { taskId }) => {
      await queryClient.invalidateQueries({
        queryKey: commentKeys.list(taskId),
      });
    },
  });
};
