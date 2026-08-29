import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  applyProjectChangePlan,
  applyProjectPlan,
  generateProjectChangePlan,
  generateProjectPlan,
  getAICapabilities,
  getAIWorkspaceUsage,
} from "@/api/ai";
import { projectKeys } from "@/features/projects/hooks";
import { taskKeys } from "@/features/tasks/hooks";

export const aiKeys = {
  all: ["ai"] as const,
  capabilities: () => [...aiKeys.all, "capabilities"] as const,
  usage: (workspaceId: string) =>
    [...aiKeys.all, "usage", workspaceId] as const,
};

export const useAICapabilities = () =>
  useQuery({
    queryFn: getAICapabilities,
    queryKey: aiKeys.capabilities(),
    staleTime: 5 * 60 * 1_000,
  });

export const useAIWorkspaceUsage = (
  workspaceId: string | null,
  enabled: boolean,
) =>
  useQuery({
    enabled: enabled && workspaceId !== null,
    queryFn: () => getAIWorkspaceUsage(workspaceId ?? ""),
    queryKey: aiKeys.usage(workspaceId ?? ""),
    staleTime: 30_000,
  });

export const useGenerateProjectPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generateProjectPlan,
    onSettled: async (_data, _error, variables) => {
      await queryClient.invalidateQueries({
        queryKey: aiKeys.usage(variables.workspace_id),
      });
    },
  });
};

export const useApplyProjectPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: applyProjectPlan,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectKeys.all }),
        queryClient.invalidateQueries({ queryKey: taskKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["activities"] }),
        queryClient.invalidateQueries({ queryKey: ["audit"] }),
      ]);
    },
  });
};

export const useGenerateProjectChangePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generateProjectChangePlan,
    onSettled: async (_data, _error, variables) => {
      await queryClient.invalidateQueries({
        queryKey: aiKeys.usage(variables.workspace_id),
      });
    },
  });
};

export const useApplyProjectChangePlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: applyProjectChangePlan,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: taskKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["activities"] }),
        queryClient.invalidateQueries({ queryKey: ["audit"] }),
      ]);
    },
  });
};
