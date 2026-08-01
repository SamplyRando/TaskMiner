import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  acceptInvitation,
  createWorkspaceInvitation,
  getInvitation,
  listWorkspaceInvitations,
  revokeInvitation,
} from "@/api/invitations";
import { listWorkspaces } from "@/api/workspace";
import { workspaceKeys } from "@/features/workspaces/hooks";
import { workspacePermissionKeys } from "@/features/workspaces/permissions-hooks";
import { useWorkspaceStore } from "@/store/workspace-store";
import type {
  InvitationCreate,
  InvitationListParams,
} from "@/types/invitation";

export const invitationKeys = {
  all: ["workspace-invitations"] as const,
  lists: () => [...invitationKeys.all, "list"] as const,
  list: (workspaceId: string, params: InvitationListParams) =>
    [...invitationKeys.lists(), workspaceId, params] as const,
  details: () => [...invitationKeys.all, "detail"] as const,
  detail: (token: string) => [...invitationKeys.details(), token] as const,
};

export const useWorkspaceInvitations = (
  workspaceId: string | null,
  params: InvitationListParams,
  enabled = true,
) =>
  useQuery({
    enabled: enabled && workspaceId !== null,
    placeholderData: keepPreviousData,
    queryFn: () => listWorkspaceInvitations(workspaceId ?? "", params),
    queryKey: invitationKeys.list(workspaceId ?? "", params),
  });

export const useInvitation = (token: string | null) =>
  useQuery({
    enabled: Boolean(token),
    queryFn: () => getInvitation(token ?? ""),
    queryKey: invitationKeys.detail(token ?? ""),
  });

type CreateInvitationVariables = {
  workspaceId: string;
  data: InvitationCreate;
};

export const useCreateInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data, workspaceId }: CreateInvitationVariables) =>
      createWorkspaceInvitation(workspaceId, data),
    onSuccess: async (_invitation, { workspaceId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: invitationKeys.lists() }),
        queryClient.invalidateQueries({
          queryKey: ["activities", workspaceId],
        }),
      ]);
    },
  });
};

export const useRevokeInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeInvitation,
    onSuccess: async (invitation) => {
      queryClient.setQueryData(
        invitationKeys.detail(invitation.token),
        invitation,
      );
      await queryClient.invalidateQueries({ queryKey: invitationKeys.lists() });
    },
  });
};

export const useAcceptInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: acceptInvitation,
    onSuccess: async (invitation) => {
      queryClient.setQueryData(
        invitationKeys.detail(invitation.token),
        invitation,
      );
      await queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
      const workspaces = await queryClient.fetchQuery({
        queryFn: listWorkspaces,
        queryKey: workspaceKeys.list(),
      });
      if (workspaces.some(({ id }) => id === invitation.workspace_id)) {
        useWorkspaceStore
          .getState()
          .setActiveWorkspaceId(invitation.workspace_id);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: invitationKeys.all }),
        queryClient.invalidateQueries({
          queryKey: workspacePermissionKeys.all,
        }),
      ]);
    },
  });
};
