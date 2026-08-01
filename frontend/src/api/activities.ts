import { apiClient } from "@/api/client";
import type { ActivityFeed, ActivityListParams } from "@/types/activity";

export const listWorkspaceActivities = async (
  workspaceId: string,
  params: ActivityListParams,
): Promise<ActivityFeed> => {
  const response = await apiClient.get<ActivityFeed>(
    `/workspaces/${workspaceId}/activities`,
    { params },
  );
  return response.data;
};
