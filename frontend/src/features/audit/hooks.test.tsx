import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listWorkspaceAudit } from "@/api/audit";
import { auditKeys, useWorkspaceAudit } from "@/features/audit/hooks";
import { auditFeedFixture, firstWorkspace } from "@/test/activity-fixtures";

vi.mock("@/api/audit", () => ({ listWorkspaceAudit: vi.fn() }));

const mockedListAudit = vi.mocked(listWorkspaceAudit);
const params = {
  event_type: "task_updated" as const,
  limit: 20,
  offset: 0,
  resource_type: "task" as const,
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useWorkspaceAudit", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads filtered audit data with a workspace-scoped key", async () => {
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
});
