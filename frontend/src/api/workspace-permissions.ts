import { apiClient } from "@/api/client";
import type { WorkspacePermissions } from "@/types/permissions";

export const getWorkspacePermissions = async (
  workspaceId: string,
): Promise<WorkspacePermissions> => {
  const response = await apiClient.get<WorkspacePermissions>(
    `/workspaces/${workspaceId}/permissions`,
  );
  return response.data;
};
