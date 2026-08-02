import {
  type InfiniteData,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { connectAuditStream, listWorkspaceAudit } from "@/api/audit";
import {
  auditKeys,
  prependRealtimeAudit,
  useAuditStream,
  useInfiniteWorkspaceAudit,
  useWorkspaceAudit,
} from "@/features/audit/hooks";
import { authenticateStore, resetAuthStore } from "@/test/auth-fixtures";
import {
  auditFeedFixture,
  auditLogFixture,
  firstWorkspace,
} from "@/test/activity-fixtures";
import type { AuditFeed } from "@/types/audit";

vi.mock("@/api/audit", () => ({
  connectAuditStream: vi.fn(),
  listWorkspaceAudit: vi.fn(),
}));

const mockedConnectStream = vi.mocked(connectAuditStream);
const mockedListAudit = vi.mocked(listWorkspaceAudit);
const params = { limit: 20, offset: 0 };

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("audit hooks", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    resetAuthStore();
  });

  it("loads audit data with a workspace-scoped key", async () => {
    mockedListAudit.mockResolvedValue(auditFeedFixture);
    const { result } = renderHook(
      () => useWorkspaceAudit(firstWorkspace.id, params),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual(auditFeedFixture);
    expect(auditKeys.list(firstWorkspace.id, params)).toEqual([
      "audit",
      firstWorkspace.id,
      params,
    ]);
  });

  it("does not request audit data without an active workspace", () => {
    const { result } = renderHook(() => useWorkspaceAudit(null, params), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedListAudit).not.toHaveBeenCalled();
  });

  it("loads additional history pages", async () => {
    mockedListAudit
      .mockResolvedValueOnce({
        count: 21,
        items: Array.from({ length: 20 }, (_, index) => ({
          ...auditLogFixture,
          id: `first-page-${String(index)}`,
        })),
      })
      .mockResolvedValueOnce({
        count: 21,
        items: [{ ...auditLogFixture, id: "second-page-audit" }],
      });
    const { result } = renderHook(
      () => useInfiniteWorkspaceAudit(firstWorkspace.id, {}),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(true);
    });
    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(mockedListAudit).toHaveBeenLastCalledWith(firstWorkspace.id, {
      limit: 20,
      offset: 20,
    });
    await waitFor(() => {
      expect(result.current.data?.pages).toHaveLength(2);
    });
  });

  it("prepends real-time logs without duplicates", () => {
    const queryClient = new QueryClient();
    const filters = {};
    const data: InfiniteData<AuditFeed, number> = {
      pageParams: [0],
      pages: [auditFeedFixture],
    };
    queryClient.setQueryData(auditKeys.feed(firstWorkspace.id, filters), data);
    const liveAudit = { ...auditLogFixture, id: "live-audit" };

    prependRealtimeAudit(queryClient, firstWorkspace.id, filters, liveAudit);
    prependRealtimeAudit(queryClient, firstWorkspace.id, filters, liveAudit);

    const updated = queryClient.getQueryData<InfiniteData<AuditFeed, number>>(
      auditKeys.feed(firstWorkspace.id, filters),
    );
    expect(updated?.pages[0]?.items[0]).toEqual(liveAudit);
    expect(updated?.pages[0]?.items).toHaveLength(2);
    expect(updated?.pages[0]?.count).toBe(2);
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
    const { result } = renderHook(
      () => useAuditStream({ filters: {}, workspaceId: firstWorkspace.id }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.status).toBe("live");
    });
  });

  it("reconnects automatically after an interruption", async () => {
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
    const { result, unmount } = renderHook(
      () => useAuditStream({ filters: {}, workspaceId: firstWorkspace.id }),
      { wrapper: createWrapper() },
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
