import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteAttachment,
  downloadAttachment,
  listTaskAttachments,
  uploadTaskAttachment,
} from "@/api/attachments";

export const attachmentKeys = {
  all: ["attachments"] as const,
  list: (taskId: string) => [...attachmentKeys.all, "task", taskId] as const,
};

export const useTaskAttachments = (
  taskId: string | undefined,
  enabled: boolean,
) =>
  useQuery({
    enabled: enabled && Boolean(taskId),
    queryKey: attachmentKeys.list(taskId ?? ""),
    queryFn: () => listTaskAttachments(taskId ?? ""),
  });

type UploadAttachmentVariables = {
  file: File;
  taskId: string;
};

export const useUploadAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, taskId }: UploadAttachmentVariables) =>
      uploadTaskAttachment(taskId, file),
    onSuccess: async (_attachment, { taskId }) => {
      await queryClient.invalidateQueries({
        queryKey: attachmentKeys.list(taskId),
      });
    },
  });
};

type DeleteAttachmentVariables = {
  attachmentId: string;
  taskId: string;
};

export const useDeleteAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ attachmentId }: DeleteAttachmentVariables) =>
      deleteAttachment(attachmentId),
    onSuccess: async (_result, { taskId }) => {
      await queryClient.invalidateQueries({
        queryKey: attachmentKeys.list(taskId),
      });
    },
  });
};

export const useDownloadAttachment = () =>
  useMutation({
    mutationFn: (attachmentId: string) => downloadAttachment(attachmentId),
  });
