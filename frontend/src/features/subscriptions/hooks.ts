import { useQuery } from "@tanstack/react-query";

import { getWorkspaceSubscription } from "@/api/subscription";

export const subscriptionKeys = {
  all: ["workspace-subscriptions"] as const,
  detail: (workspaceId: string) =>
    [...subscriptionKeys.all, workspaceId] as const,
};

export const useWorkspaceSubscription = (
  workspaceId: string | null,
  enabled = true,
) =>
  useQuery({
    enabled: enabled && workspaceId !== null,
    queryFn: () => getWorkspaceSubscription(workspaceId ?? ""),
    queryKey: subscriptionKeys.detail(workspaceId ?? ""),
    staleTime: 30_000,
  });
