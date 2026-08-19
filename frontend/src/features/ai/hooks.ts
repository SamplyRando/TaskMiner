import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  applyProjectChangePlan,
  applyProjectPlan,
  generateProjectChangePlan,
  generateProjectPlan,
  getAICapabilities,
} from "@/api/ai";
import { projectKeys } from "@/features/projects/hooks";
import { taskKeys } from "@/features/tasks/hooks";

export const aiKeys = {
  all: ["ai"] as const,
  capabilities: () => [...aiKeys.all, "capabilities"] as const,
};

export const useAICapabilities = () =>
  useQuery({
    queryFn: getAICapabilities,
    queryKey: aiKeys.capabilities(),
    staleTime: 5 * 60 * 1_000,
  });

export const useGenerateProjectPlan = () =>
  useMutation({ mutationFn: generateProjectPlan });

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

export const useGenerateProjectChangePlan = () =>
  useMutation({ mutationFn: generateProjectChangePlan });

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
