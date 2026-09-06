import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getWorkspaceSubscription } from "@/api/subscription";
import { useWorkspaceSubscription } from "@/features/subscriptions/hooks";
import { proSubscriptionFixture } from "@/test/subscription-fixtures";

vi.mock("@/api/subscription", () => ({
  getWorkspaceSubscription: vi.fn(),
}));

const mockedSubscription = vi.mocked(getWorkspaceSubscription);

describe("useWorkspaceSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refetches current billing state when the workspace view remounts", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    mockedSubscription
      .mockResolvedValueOnce({
        ...proSubscriptionFixture,
        cancel_at_period_end: false,
        scheduled_cancellation_at: null,
      })
      .mockResolvedValueOnce({
        ...proSubscriptionFixture,
        cancel_at_period_end: false,
        scheduled_cancellation_at: "2026-10-06T12:00:00Z",
      });

    const firstRender = renderHook(
      () => useWorkspaceSubscription("workspace-id"),
      { wrapper },
    );
    await waitFor(() => {
      expect(firstRender.result.current.data?.cancel_at_period_end).toBe(false);
    });
    firstRender.unmount();

    const secondRender = renderHook(
      () => useWorkspaceSubscription("workspace-id"),
      { wrapper },
    );
    await waitFor(() => {
      expect(mockedSubscription).toHaveBeenCalledTimes(2);
      expect(secondRender.result.current.data?.scheduled_cancellation_at).toBe(
        "2026-10-06T12:00:00Z",
      );
    });
  });
});
