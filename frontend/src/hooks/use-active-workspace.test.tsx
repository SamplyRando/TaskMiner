import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listWorkspaces } from "@/api/workspace";
import { useActiveWorkspace } from "@/hooks/use-active-workspace";
import { useWorkspaceStore } from "@/store/workspace-store";
import { firstWorkspace, secondWorkspace } from "@/test/activity-fixtures";

vi.mock("@/api/workspace", () => ({
  createWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
  listWorkspaces: vi.fn(),
  updateWorkspace: vi.fn(),
}));

const mockedListWorkspaces = vi.mocked(listWorkspaces);

const renderActiveWorkspace = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useActiveWorkspace(), { wrapper });
};

describe("useActiveWorkspace", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    useWorkspaceStore.setState({ activeWorkspaceId: null });
    mockedListWorkspaces.mockResolvedValue([firstWorkspace, secondWorkspace]);
  });

  it("automatically selects and persists the first workspace", async () => {
    const { result } = renderActiveWorkspace();

    await waitFor(() => {
      expect(result.current.activeWorkspaceId).toBe(firstWorkspace.id);
    });
    await waitFor(() => {
      expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(
        firstWorkspace.id,
      );
    });
  });

  it("keeps a valid remembered workspace and supports manual changes", async () => {
    useWorkspaceStore.setState({ activeWorkspaceId: secondWorkspace.id });
    const { result } = renderActiveWorkspace();

    await waitFor(() => {
      expect(result.current.activeWorkspaceId).toBe(secondWorkspace.id);
    });
    act(() => {
      result.current.selectWorkspace(firstWorkspace.id);
    });
    await waitFor(() => {
      expect(result.current.activeWorkspaceId).toBe(firstWorkspace.id);
    });
  });

  it("replaces a remembered workspace that no longer exists", async () => {
    useWorkspaceStore.setState({ activeWorkspaceId: "deleted-workspace" });
    const { result } = renderActiveWorkspace();

    await waitFor(() => {
      expect(result.current.activeWorkspaceId).toBe(firstWorkspace.id);
    });
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(
      firstWorkspace.id,
    );
  });
});
