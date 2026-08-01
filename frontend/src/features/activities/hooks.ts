import { useQuery } from "@tanstack/react-query";

import { listWorkspaceActivities } from "@/api/activities";
import type { ActivityListParams } from "@/types/activity";

export const activityKeys = {
  all: ["activities"] as const,
  workspace: (workspaceId: string) =>
    [...activityKeys.all, workspaceId] as const,
  list: (workspaceId: string, params: ActivityListParams) =>
    [...activityKeys.workspace(workspaceId), params] as const,
};

export const useWorkspaceActivities = (
  workspaceId: string | null,
  params: ActivityListParams,
) =>
  useQuery({
    enabled: workspaceId !== null,
    queryFn: () => {
      if (workspaceId === null) {
        throw new Error("A workspace is required to load activities.");
      }
      return listWorkspaceActivities(workspaceId, params);
    },
    queryKey: activityKeys.list(workspaceId ?? "none", params),
    staleTime: 30_000,
  });
