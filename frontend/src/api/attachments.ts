import { apiClient } from "@/api/client";
import type { Attachment } from "@/types/attachment";

export const listTaskAttachments = async (
  taskId: string,
): Promise<Attachment[]> => {
  const response = await apiClient.get<Attachment[]>(
    `/tasks/${taskId}/attachments`,
  );
  return response.data;
};

export const uploadTaskAttachment = async (
  taskId: string,
  file: File,
): Promise<Attachment> => {
  const data = new FormData();
  data.append("file", file);
  const response = await apiClient.post<Attachment>(
    `/tasks/${taskId}/attachments`,
    data,
  );
  return response.data;
};

export const downloadAttachment = async (
  attachmentId: string,
): Promise<Blob> => {
  const response = await apiClient.get<Blob>(`/attachments/${attachmentId}`, {
    responseType: "blob",
  });
  return response.data;
};

export const deleteAttachment = async (attachmentId: string): Promise<void> => {
  await apiClient.delete(`/attachments/${attachmentId}`);
};
