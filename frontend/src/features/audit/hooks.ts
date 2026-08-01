import { useQuery } from "@tanstack/react-query";

import { listWorkspaceAudit } from "@/api/audit";
import type { AuditListParams } from "@/types/audit";

export const auditKeys = {
  all: ["audit"] as const,
  workspace: (workspaceId: string) => [...auditKeys.all, workspaceId] as const,
  list: (workspaceId: string, params: AuditListParams) =>
    [...auditKeys.workspace(workspaceId), params] as const,
};

export const useWorkspaceAudit = (
  workspaceId: string | null,
  params: AuditListParams,
) =>
  useQuery({
    enabled: workspaceId !== null,
    queryFn: () => {
      if (workspaceId === null) {
        throw new Error("A workspace is required to load audit logs.");
      }
      return listWorkspaceAudit(workspaceId, params);
    },
    queryKey: auditKeys.list(workspaceId ?? "none", params),
    staleTime: 30_000,
  });
