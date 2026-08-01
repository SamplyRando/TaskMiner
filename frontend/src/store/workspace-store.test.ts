import { beforeEach, describe, expect, it } from "vitest";

import { useWorkspaceStore } from "@/store/workspace-store";
import { firstWorkspace } from "@/test/activity-fixtures";

describe("useWorkspaceStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useWorkspaceStore.setState({ activeWorkspaceId: null });
  });

  it("persists the selected workspace identifier", () => {
    useWorkspaceStore.getState().setActiveWorkspaceId(firstWorkspace.id);

    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(
      firstWorkspace.id,
    );
    expect(localStorage.getItem("taskminer-workspace")).toContain(
      firstWorkspace.id,
    );
  });

  it("can clear the active workspace", () => {
    useWorkspaceStore.getState().setActiveWorkspaceId(firstWorkspace.id);
    useWorkspaceStore.getState().setActiveWorkspaceId(null);

    expect(useWorkspaceStore.getState().activeWorkspaceId).toBeNull();
  });
});
