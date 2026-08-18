import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  applyProjectChangePlan,
  applyProjectPlan,
  generateProjectChangePlan,
  generateProjectPlan,
} from "@/api/ai";
import { projectKeys } from "@/features/projects/hooks";
import { taskKeys } from "@/features/tasks/hooks";

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
