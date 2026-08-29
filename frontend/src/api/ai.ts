import { apiClient } from "@/api/client";
import type {
  AICapabilities,
  AIApplyProjectChangePlanRequest,
  AIApplyProjectChangePlanResponse,
  AIApplyProjectPlanRequest,
  AIApplyProjectPlanResponse,
  AIProjectChangePlanRequest,
  AIProjectChangePlanResponse,
  AIProjectPlanRequest,
  AIProjectPlanResponse,
  AIWorkspaceUsage,
} from "@/types/ai";

const AI_GENERATION_TIMEOUT_MS = 60_000;

export const getAICapabilities = async (): Promise<AICapabilities> => {
  const response = await apiClient.get<AICapabilities>("/ai/capabilities");
  return response.data;
};

export const getAIWorkspaceUsage = async (
  workspaceId: string,
): Promise<AIWorkspaceUsage> => {
  const response = await apiClient.get<AIWorkspaceUsage>(
    `/workspaces/${workspaceId}/ai/usage`,
  );
  return response.data;
};

export const generateProjectPlan = async (
  data: AIProjectPlanRequest,
): Promise<AIProjectPlanResponse> => {
  const response = await apiClient.post<AIProjectPlanResponse>(
    "/ai/project-plan",
    data,
    { timeout: AI_GENERATION_TIMEOUT_MS },
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
    { timeout: AI_GENERATION_TIMEOUT_MS },
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
