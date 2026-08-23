import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  acceptInvitation,
  createWorkspaceInvitation,
  getInvitation,
  listWorkspaceInvitations,
  resendWorkspaceInvitation,
  revokeInvitation,
} from "@/api/invitations";
import { listWorkspaces } from "@/api/workspace";
import {
  invitationKeys,
  useAcceptInvitation,
  useCreateInvitation,
  useInvitation,
  useResendInvitation,
  useRevokeInvitation,
  useWorkspaceInvitations,
} from "@/features/invitations/hooks";
import { useWorkspaceStore } from "@/store/workspace-store";
import {
  acceptedWorkspace,
  firstWorkspace,
  invitationFixture,
  invitationListFixture,
} from "@/test/invitation-fixtures";

vi.mock("@/api/invitations", () => ({
  acceptInvitation: vi.fn(),
  createWorkspaceInvitation: vi.fn(),
  getInvitation: vi.fn(),
  listWorkspaceInvitations: vi.fn(),
  resendWorkspaceInvitation: vi.fn(),
  revokeInvitation: vi.fn(),
}));

vi.mock("@/api/workspace", () => ({
  createWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
  listWorkspaces: vi.fn(),
  updateWorkspace: vi.fn(),
}));

const mockedAccept = vi.mocked(acceptInvitation);
const mockedCreate = vi.mocked(createWorkspaceInvitation);
const mockedGet = vi.mocked(getInvitation);
const mockedList = vi.mocked(listWorkspaceInvitations);
const mockedListWorkspaces = vi.mocked(listWorkspaces);
const mockedRevoke = vi.mocked(revokeInvitation);
const mockedResend = vi.mocked(resendWorkspaceInvitation);
const params = { limit: 20, skip: 0, sort: "-created_at" } as const;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  return {
    queryClient,
    wrapper: ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
};

describe("invitation hooks", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    useWorkspaceStore.setState({ activeWorkspaceId: null });
  });

  it("loads the active workspace invitation page", async () => {
    mockedList.mockResolvedValue(invitationListFixture);
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useWorkspaceInvitations(firstWorkspace.id, params),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockedList).toHaveBeenCalledWith(firstWorkspace.id, params);
    expect(result.current.data).toEqual(invitationListFixture);
  });

  it("does not list invitations without a workspace or permission", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useWorkspaceInvitations(null, params, false),
      { wrapper },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedList).not.toHaveBeenCalled();
  });

  it("loads an invitation from its token", async () => {
    mockedGet.mockResolvedValue(invitationFixture);
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useInvitation(invitationFixture.token),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(invitationFixture);
    });
  });

  it("creates an invitation and invalidates list queries", async () => {
    mockedCreate.mockResolvedValue(invitationFixture);
    const { queryClient, wrapper } = createWrapper();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCreateInvitation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        data: { email: invitationFixture.email, role: "member" },
        workspaceId: firstWorkspace.id,
      });
    });

    expect(mockedCreate).toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: invitationKeys.lists(),
    });
  });

  it("updates invitation detail after revocation", async () => {
    const revokedInvitation = {
      ...invitationFixture,
      status: "revoked" as const,
    };
    mockedRevoke.mockResolvedValue(revokedInvitation);
    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useRevokeInvitation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(invitationFixture.token);
    });

    expect(
      queryClient.getQueryData(invitationKeys.detail(invitationFixture.token)),
    ).toEqual(revokedInvitation);
  });

  it("resends an invitation and refreshes invitation lists", async () => {
    mockedResend.mockResolvedValue(invitationFixture);
    const { queryClient, wrapper } = createWrapper();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useResendInvitation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        invitationId: invitationFixture.id,
        workspaceId: firstWorkspace.id,
      });
    });

    expect(mockedResend).toHaveBeenCalledWith(
      firstWorkspace.id,
      invitationFixture.id,
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: invitationKeys.lists(),
    });
  });

  it("refreshes workspaces and activates the accepted workspace", async () => {
    const acceptedInvitation = {
      ...invitationFixture,
      status: "accepted" as const,
      workspace_id: acceptedWorkspace.id,
    };
    mockedAccept.mockResolvedValue(acceptedInvitation);
    mockedListWorkspaces.mockResolvedValue([firstWorkspace, acceptedWorkspace]);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAcceptInvitation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(invitationFixture.token);
    });

    expect(mockedListWorkspaces).toHaveBeenCalled();
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(
      acceptedWorkspace.id,
    );
  });
});
