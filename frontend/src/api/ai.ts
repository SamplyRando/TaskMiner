import { apiClient } from "@/api/client";
import type {
  AIApplyProjectPlanRequest,
  AIApplyProjectPlanResponse,
  AIProjectPlanRequest,
  AIProjectPlanResponse,
} from "@/types/ai";

export const generateProjectPlan = async (
  data: AIProjectPlanRequest,
): Promise<AIProjectPlanResponse> => {
  const response = await apiClient.post<AIProjectPlanResponse>(
    "/ai/project-plan",
    data,
  );
  return response.data;
};

export const applyProjectPlan = async (
  data: AIApplyProjectPlanRequest,
): Promise<AIApplyProjectPlanResponse> => {
  const response = await apiClient.post<AIApplyProjectPlanResponse>(
    "/ai/project-plan/apply",
    data,
  );
  return response.data;
};
