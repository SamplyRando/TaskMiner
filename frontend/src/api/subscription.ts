import { apiClient } from "@/api/client";
import type { WorkspaceSubscription } from "@/types/subscription";

export const getWorkspaceSubscription = async (
  workspaceId: string,
): Promise<WorkspaceSubscription> => {
  const response = await apiClient.get<WorkspaceSubscription>(
    `/workspaces/${workspaceId}/subscription`,
  );
  return response.data;
};
