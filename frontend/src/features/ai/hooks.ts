import { useMutation } from "@tanstack/react-query";

import { generateProjectPlan } from "@/api/ai";

export const useGenerateProjectPlan = () =>
  useMutation({ mutationFn: generateProjectPlan });
