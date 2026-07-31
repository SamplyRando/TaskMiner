import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getDashboard } from "@/api/dashboard";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  detail: () => [...dashboardKeys.all, "detail"] as const,
};

export const useDashboard = () =>
  useQuery({
    queryKey: dashboardKeys.detail(),
    queryFn: getDashboard,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
