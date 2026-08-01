import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const WORKSPACE_STORAGE_KEY = "taskminer-workspace";

type WorkspaceState = {
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (workspaceId: string | null) => void;
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      setActiveWorkspaceId: (activeWorkspaceId) => {
        set({ activeWorkspaceId });
      },
    }),
    {
      name: WORKSPACE_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ activeWorkspaceId }) => ({ activeWorkspaceId }),
      version: 1,
    },
  ),
);
