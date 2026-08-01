import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const TASK_VIEW_STORAGE_KEY = "taskminer-task-view";

export type TaskViewMode = "kanban" | "list";

type TaskViewState = {
  mode: TaskViewMode;
  setMode: (mode: TaskViewMode) => void;
};

export const useTaskViewStore = create<TaskViewState>()(
  persist(
    (set) => ({
      mode: "list",
      setMode: (mode) => {
        set({ mode });
      },
    }),
    {
      name: TASK_VIEW_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ mode }) => ({ mode }),
      version: 1,
    },
  ),
);
