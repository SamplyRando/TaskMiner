import { useQuery } from "@tanstack/react-query";

import { getWorkspacePermissions } from "@/api/workspace-permissions";

export const workspacePermissionKeys = {
  all: ["workspace-permissions"] as const,
  detail: (workspaceId: string) =>
    [...workspacePermissionKeys.all, workspaceId] as const,
};

export const useWorkspacePermissions = (workspaceId: string | null) =>
  useQuery({
    enabled: workspaceId !== null,
    queryKey: workspacePermissionKeys.detail(workspaceId ?? ""),
    queryFn: () => getWorkspacePermissions(workspaceId ?? ""),
    staleTime: 60_000,
  });
