import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getDashboard, getDashboardProjects } from "@/api/dashboard";
import type {
  DashboardParams,
  DashboardProjectListParams,
} from "@/types/dashboard";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  detail: (params: DashboardParams) =>
    [...dashboardKeys.all, "detail", params] as const,
  projects: (params: DashboardProjectListParams) =>
    [...dashboardKeys.all, "projects", params] as const,
};

export const useDashboard = (params: DashboardParams) =>
  useQuery({
    queryKey: dashboardKeys.detail(params),
    queryFn: () => getDashboard(params),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  });

export const useDashboardProjects = (params: DashboardProjectListParams) =>
  useQuery({
    queryKey: dashboardKeys.projects(params),
    queryFn: () => getDashboardProjects(params),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  });
