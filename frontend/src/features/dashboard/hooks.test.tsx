import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDashboard } from "@/api/dashboard";
import { dashboardKeys, useDashboard } from "@/features/dashboard/hooks";
import { dashboardFixture } from "@/test/dashboard-fixtures";

vi.mock("@/api/dashboard", () => ({ getDashboard: vi.fn() }));

const mockedGetDashboard = vi.mocked(getDashboard);

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

    const first = renderHook(() => useDashboard(), { wrapper });
    await waitFor(() => {
      expect(first.result.current.isSuccess).toBe(true);
    });
    first.unmount();
    const second = renderHook(() => useDashboard(), { wrapper });

    expect(second.result.current.data).toEqual(dashboardFixture);
    expect(mockedGetDashboard).toHaveBeenCalledTimes(1);
    expect(dashboardKeys.detail()).toEqual(["dashboard", "detail"]);
  });
});
