import { apiClient } from "@/api/client";
import type { Workspace, WorkspaceInput } from "@/types/workspace";

export const listWorkspaces = async (): Promise<Workspace[]> => {
  const response = await apiClient.get<Workspace[]>("/workspaces");
  return response.data;
};

export const createWorkspace = async (
  data: WorkspaceInput,
): Promise<Workspace> => {
  const response = await apiClient.post<Workspace>("/workspaces", data);
  return response.data;
};

export const updateWorkspace = async (
  workspaceId: string,
  data: WorkspaceInput,
): Promise<Workspace> => {
  const response = await apiClient.patch<Workspace>(
    `/workspaces/${workspaceId}`,
    data,
  );
  return response.data;
};

export const deleteWorkspace = async (workspaceId: string): Promise<void> => {
  await apiClient.delete(`/workspaces/${workspaceId}`);
};
