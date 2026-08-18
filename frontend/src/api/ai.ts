import { apiClient } from "@/api/client";
import type {
  AIApplyProjectChangePlanRequest,
  AIApplyProjectChangePlanResponse,
  AIApplyProjectPlanRequest,
  AIApplyProjectPlanResponse,
  AIProjectChangePlanRequest,
  AIProjectChangePlanResponse,
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

export const generateProjectChangePlan = async (
  data: AIProjectChangePlanRequest,
): Promise<AIProjectChangePlanResponse> => {
  const response = await apiClient.post<AIProjectChangePlanResponse>(
    "/ai/project-change-plan",
    data,
  );
  return response.data;
};

export const applyProjectChangePlan = async (
  data: AIApplyProjectChangePlanRequest,
): Promise<AIApplyProjectChangePlanResponse> => {
  const response = await apiClient.post<AIApplyProjectChangePlanResponse>(
    "/ai/project-change-plan/apply",
    data,
  );
  return response.data;
};
