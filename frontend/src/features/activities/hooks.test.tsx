import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listWorkspaceActivities } from "@/api/activities";
import {
  activityKeys,
  useWorkspaceActivities,
} from "@/features/activities/hooks";
import { activityFeedFixture, firstWorkspace } from "@/test/activity-fixtures";

vi.mock("@/api/activities", () => ({
  listWorkspaceActivities: vi.fn(),
}));

const mockedListActivities = vi.mocked(listWorkspaceActivities);
const params = { limit: 20, offset: 0 };

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useWorkspaceActivities", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads a workspace feed with a stable query key", async () => {
    mockedListActivities.mockResolvedValue(activityFeedFixture);
    const { result } = renderHook(
      () => useWorkspaceActivities(firstWorkspace.id, params),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual(activityFeedFixture);
    expect(activityKeys.list(firstWorkspace.id, params)).toEqual([
      "activities",
      firstWorkspace.id,
      params,
    ]);
  });

  it("does not request activities without an active workspace", () => {
    const { result } = renderHook(() => useWorkspaceActivities(null, params), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedListActivities).not.toHaveBeenCalled();
  });
});
