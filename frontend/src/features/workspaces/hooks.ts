import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createWorkspace,
  deleteWorkspace,
  listWorkspaces,
  updateWorkspace,
} from "@/api/workspace";
import type { Workspace, WorkspaceInput } from "@/types/workspace";

export const workspaceKeys = {
  all: ["workspaces"] as const,
  list: () => [...workspaceKeys.all, "list"] as const,
};

export const useWorkspaces = () =>
  useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: listWorkspaces,
  });

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createWorkspace,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
};

type UpdateWorkspaceVariables = {
  workspaceId: string;
  data: WorkspaceInput;
};

export const useUpdateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data, workspaceId }: UpdateWorkspaceVariables) =>
      updateWorkspace(workspaceId, data),
    onMutate: async ({ data, workspaceId }) => {
      await queryClient.cancelQueries({ queryKey: workspaceKeys.list() });
      const previous = queryClient.getQueryData<Workspace[]>(
        workspaceKeys.list(),
      );
      queryClient.setQueryData<Workspace[]>(workspaceKeys.list(), (current) =>
        current?.map((workspace) =>
          workspace.id === workspaceId ? { ...workspace, ...data } : workspace,
        ),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(workspaceKeys.list(), context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
};

export const useDeleteWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteWorkspace,
    onMutate: async (workspaceId) => {
      await queryClient.cancelQueries({ queryKey: workspaceKeys.list() });
      const previous = queryClient.getQueryData<Workspace[]>(
        workspaceKeys.list(),
      );
      queryClient.setQueryData<Workspace[]>(workspaceKeys.list(), (current) =>
        current?.filter((workspace) => workspace.id !== workspaceId),
      );
      return { previous };
    },
    onError: (_error, _workspaceId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(workspaceKeys.list(), context.previous);
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workspaceKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ]);
    },
  });
};
