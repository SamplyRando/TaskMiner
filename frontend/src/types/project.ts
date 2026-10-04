import type { PaginationParams } from "@/types/pagination";

export type Project = {
  id: string;
  name: string;
  description: string | null;
  due_date: string | null;
  owner_id: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  task_statuses?: ProjectTaskStatus[];
};

export type ProjectTaskStatus = {
  key: string;
  label: string;
  position: number;
  is_completed: boolean;
};

export type ProjectTemplate = {
  format: "taskminer-project-template";
  version: 1;
  name: string;
  description: string | null;
  statuses: ProjectTaskStatus[];
  tasks: {
    title: string;
    description: string | null;
    priority: import("@/types/task").TaskPriority;
    status: string;
  }[];
};

export const DEFAULT_PROJECT_STATUSES: ProjectTaskStatus[] = [
  { key: "todo", label: "À faire", position: 0, is_completed: false },
  {
    key: "in_progress",
    label: "En cours",
    position: 1,
    is_completed: false,
  },
  { key: "done", label: "Terminée", position: 2, is_completed: true },
];

export const getProjectStatuses = (project?: Project): ProjectTaskStatus[] =>
  [...(project?.task_statuses ?? DEFAULT_PROJECT_STATUSES)].sort(
    (left, right) => left.position - right.position,
  );

export type ProjectInput = {
  name: string;
  description: string | null;
  due_date: string | null;
};

export type ProjectSort =
  | "created_at"
  | "updated_at"
  | "name"
  | "-created_at"
  | "-updated_at"
  | "-name";

export type ProjectListParams = PaginationParams & {
  search?: string;
  workspace_id?: string;
  sort: ProjectSort;
};
