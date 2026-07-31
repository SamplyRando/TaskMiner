import type { PaginationParams } from "@/types/pagination";

export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  project_id: string;
  assigned_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskInput = {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
};

export type TaskSort =
  | "created_at"
  | "updated_at"
  | "title"
  | "-created_at"
  | "-updated_at"
  | "-title";

export type TaskListParams = PaginationParams & {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  project_id?: string;
  sort: TaskSort;
};
