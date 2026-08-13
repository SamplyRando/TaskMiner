import { apiClient } from "@/api/client";
import type { AIProjectPlanRequest, AIProjectPlanResponse } from "@/types/ai";

export const generateProjectPlan = async (
  data: AIProjectPlanRequest,
): Promise<AIProjectPlanResponse> => {
  const response = await apiClient.post<AIProjectPlanResponse>(
    "/ai/project-plan",
    data,
  );
  return response.data;
};
