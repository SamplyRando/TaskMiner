import { apiClient } from "@/api/client";
import type { AuditFeed, AuditListParams } from "@/types/audit";

export const listWorkspaceAudit = async (
  workspaceId: string,
  params: AuditListParams,
): Promise<AuditFeed> => {
  const response = await apiClient.get<AuditFeed>(
    `/workspaces/${workspaceId}/audit`,
    { params },
  );
  return response.data;
};
