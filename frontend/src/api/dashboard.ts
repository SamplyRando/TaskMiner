import { apiClient } from "@/api/client";
import type {
  DashboardData,
  DashboardParams,
  DashboardProjectListParams,
  DashboardRecentProjectPage,
} from "@/types/dashboard";

export const getDashboard = async (
  params: DashboardParams,
): Promise<DashboardData> => {
  const response = await apiClient.get<DashboardData>("/dashboard", {
    params,
  });
  return response.data;
};

export const getDashboardProjects = async (
  params: DashboardProjectListParams,
): Promise<DashboardRecentProjectPage> => {
  const response = await apiClient.get<DashboardRecentProjectPage>(
    "/dashboard/projects",
    { params },
  );
  return response.data;
};
