import { useEffect, useMemo } from "react";

import { useWorkspaces } from "@/features/workspaces/hooks";
import { useWorkspaceStore } from "@/store/workspace-store";

export function useActiveWorkspace() {
  const workspacesQuery = useWorkspaces();
  const storedWorkspaceId = useWorkspaceStore(
    (state) => state.activeWorkspaceId,
  );
  const setActiveWorkspaceId = useWorkspaceStore(
    (state) => state.setActiveWorkspaceId,
  );
  const workspaces = useMemo(
    () => workspacesQuery.data ?? [],
    [workspacesQuery.data],
  );
  const activeWorkspace = useMemo(
    () =>
      workspaces.find((workspace) => workspace.id === storedWorkspaceId) ??
      workspaces[0] ??
      null,
    [storedWorkspaceId, workspaces],
  );

  useEffect(() => {
    if (!workspacesQuery.isSuccess) {
      return;
    }
    const resolvedWorkspaceId = activeWorkspace?.id ?? null;
    if (resolvedWorkspaceId !== storedWorkspaceId) {
      setActiveWorkspaceId(resolvedWorkspaceId);
    }
  }, [
    activeWorkspace,
    setActiveWorkspaceId,
    storedWorkspaceId,
    workspacesQuery.isSuccess,
  ]);

  return {
    activeWorkspace,
    activeWorkspaceId: activeWorkspace?.id ?? null,
    error: workspacesQuery.error,
    isError: workspacesQuery.isError,
    isPending: workspacesQuery.isPending,
    refetch: workspacesQuery.refetch,
    selectWorkspace: setActiveWorkspaceId,
    workspaces,
  };
}
