import { apiClient } from "@/api/client";
import type {
  InvitationCreate,
  InvitationList,
  InvitationListParams,
  WorkspaceInvitation,
} from "@/types/invitation";

export const listWorkspaceInvitations = async (
  workspaceId: string,
  params: InvitationListParams,
): Promise<InvitationList> => {
  const response = await apiClient.get<InvitationList>(
    `/workspaces/${workspaceId}/invitations`,
    { params },
  );
  return response.data;
};

export const createWorkspaceInvitation = async (
  workspaceId: string,
  data: InvitationCreate,
): Promise<WorkspaceInvitation> => {
  const response = await apiClient.post<WorkspaceInvitation>(
    `/workspaces/${workspaceId}/invitations`,
    data,
  );
  return response.data;
};

export const getInvitation = async (
  token: string,
): Promise<WorkspaceInvitation> => {
  const response = await apiClient.get<WorkspaceInvitation>(
    `/invitations/${encodeURIComponent(token)}`,
  );
  return response.data;
};

export const acceptInvitation = async (
  token: string,
): Promise<WorkspaceInvitation> => {
  const response = await apiClient.post<WorkspaceInvitation>(
    `/invitations/${encodeURIComponent(token)}/accept`,
  );
  return response.data;
};

export const revokeInvitation = async (
  token: string,
): Promise<WorkspaceInvitation> => {
  const response = await apiClient.post<WorkspaceInvitation>(
    `/invitations/${encodeURIComponent(token)}/revoke`,
  );
  return response.data;
};
