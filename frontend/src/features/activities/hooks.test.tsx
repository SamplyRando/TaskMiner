import {
  type InfiniteData,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  connectActivityStream,
  listWorkspaceActivities,
} from "@/api/activities";
import {
  activityKeys,
  prependRealtimeActivity,
  useActivityStream,
  useInfiniteWorkspaceActivities,
  useWorkspaceActivities,
} from "@/features/activities/hooks";
import { authenticateStore, resetAuthStore } from "@/test/auth-fixtures";
import {
  activityFeedFixture,
  activityFixture,
  firstWorkspace,
} from "@/test/activity-fixtures";
import type { ActivityFeed } from "@/types/activity";

vi.mock("@/api/activities", () => ({
  connectActivityStream: vi.fn(),
  listWorkspaceActivities: vi.fn(),
}));

const mockedConnectStream = vi.mocked(connectActivityStream);
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
    localStorage.clear();
    resetAuthStore();
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

  it("loads additional history pages for infinite scroll", async () => {
    mockedListActivities
      .mockResolvedValueOnce({
        count: 21,
        items: Array.from({ length: 20 }, (_, index) => ({
          ...activityFixture,
          id: `first-page-${String(index)}`,
        })),
      })
      .mockResolvedValueOnce({
        count: 21,
        items: [{ ...activityFixture, id: "second-page-activity" }],
      });
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useInfiniteWorkspaceActivities(firstWorkspace.id, {}),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(true);
    });
    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(mockedListActivities).toHaveBeenLastCalledWith(firstWorkspace.id, {
      limit: 20,
      offset: 20,
    });
    await waitFor(() => {
      expect(result.current.data?.pages).toHaveLength(2);
    });
  });

  it("prepends real-time activities without duplicates", () => {
    const queryClient = new QueryClient();
    const filters = {};
    const data: InfiniteData<ActivityFeed, number> = {
      pageParams: [0],
      pages: [activityFeedFixture],
    };
    queryClient.setQueryData(
      activityKeys.feed(firstWorkspace.id, filters),
      data,
    );
    const liveActivity = { ...activityFixture, id: "live-activity" };

    prependRealtimeActivity(
      queryClient,
      firstWorkspace.id,
      filters,
      liveActivity,
    );
    prependRealtimeActivity(
      queryClient,
      firstWorkspace.id,
      filters,
      liveActivity,
    );

    const updated = queryClient.getQueryData<
      InfiniteData<ActivityFeed, number>
    >(activityKeys.feed(firstWorkspace.id, filters));
    const firstPage = updated?.pages[0];
    expect(firstPage).toBeDefined();
    expect(firstPage?.items[0]).toEqual(liveActivity);
    expect(firstPage?.items).toHaveLength(2);
    expect(firstPage?.count).toBe(2);
  });

  it("reports a live stream connection", async () => {
    authenticateStore();
    mockedConnectStream.mockImplementation(async (options) => {
      options.onOpen();
      await new Promise<void>((resolve) => {
        options.signal.addEventListener(
          "abort",
          () => {
            resolve();
          },
          { once: true },
        );
      });
    });
    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useActivityStream({
          filters: {},
          workspaceId: firstWorkspace.id,
          workspaceName: firstWorkspace.name,
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.status).toBe("live");
    });
  });

  it("reconnects automatically after a lost connection", async () => {
    vi.useFakeTimers();
    authenticateStore();
    mockedConnectStream
      .mockRejectedValueOnce(new Error("connection lost"))
      .mockImplementationOnce(async (options) => {
        options.onOpen();
        await new Promise<void>((resolve) => {
          options.signal.addEventListener(
            "abort",
            () => {
              resolve();
            },
            { once: true },
          );
        });
      });
    const wrapper = createWrapper();
    const { result, unmount } = renderHook(
      () =>
        useActivityStream({
          filters: {},
          workspaceId: firstWorkspace.id,
          workspaceName: firstWorkspace.name,
        }),
      { wrapper },
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.status).toBe("reconnecting");
    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });
    expect(mockedConnectStream).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("live");
    unmount();
    vi.useRealTimers();
  });
});
