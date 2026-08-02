import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDashboard, getDashboardProjects } from "@/api/dashboard";
import {
  dashboardKeys,
  useDashboard,
  useDashboardProjects,
} from "@/features/dashboard/hooks";
import { dashboardFixture } from "@/test/dashboard-fixtures";

vi.mock("@/api/dashboard", () => ({
  getDashboard: vi.fn(),
  getDashboardProjects: vi.fn(),
}));

const mockedGetDashboard = vi.mocked(getDashboard);
const mockedGetDashboardProjects = vi.mocked(getDashboardProjects);
const params = { activity_limit: 8, period: "30d" as const };

describe("useDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads and caches dashboard data with a stable query key", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    mockedGetDashboard.mockResolvedValue(dashboardFixture);

    const first = renderHook(() => useDashboard(params), { wrapper });
    await waitFor(() => {
      expect(first.result.current.isSuccess).toBe(true);
    });
    first.unmount();
    const second = renderHook(() => useDashboard(params), { wrapper });

    expect(second.result.current.data).toEqual(dashboardFixture);
    expect(mockedGetDashboard).toHaveBeenCalledTimes(1);
    expect(dashboardKeys.detail(params)).toEqual([
      "dashboard",
      "detail",
      params,
    ]);
  });

  it("keys server project pages by filters and pagination", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const projectParams = {
      limit: 5,
      offset: 0,
      period: "30d" as const,
      sort: "-created_at" as const,
    };
    mockedGetDashboardProjects.mockResolvedValue({
      items: dashboardFixture.recent_projects,
      limit: 5,
      offset: 0,
      total: 1,
    });

    const result = renderHook(() => useDashboardProjects(projectParams), {
      wrapper,
    });
    await waitFor(() => {
      expect(result.result.current.isSuccess).toBe(true);
    });

    expect(dashboardKeys.projects(projectParams)).toEqual([
      "dashboard",
      "projects",
      projectParams,
    ]);
    expect(mockedGetDashboardProjects).toHaveBeenCalledWith(projectParams);
  });
});
