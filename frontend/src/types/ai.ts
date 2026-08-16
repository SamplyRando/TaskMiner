import type { TaskPriority, TaskStatus } from "@/types/task";

export type AIProjectPlanRequest = {
  workspace_id: string;
  project_id: string | null;
  prompt: string;
  target_date: string | null;
};

export type AIGeneratedTask = {
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  suggested_due_date: string | null;
  milestone: string | null;
  order: number;
  depends_on: number[];
};

export type AIApprovedProject = {
  name: string;
  description: string | null;
};

export type AIApprovedTask = {
  source_order: number;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  assigned_user_id: string | null;
  milestone: string | null;
  depends_on: number[];
};

export type AIApplyProjectPlanRequest = {
  workspace_id: string;
  project_id: string | null;
  project: AIApprovedProject | null;
  tasks: AIApprovedTask[];
  source_task_count: number;
  idempotency_key: string;
};

export type AIApplyProjectPlanResponse = {
  project_id: string;
  created_project: boolean;
  created_task_ids: string[];
  created_task_count: number;
  skipped_task_count: number;
  idempotent_replay: boolean;
  warnings: string[];
};

export type AIGeneratedMilestone = {
  name: string;
  description: string | null;
  suggested_due_date: string | null;
  order: number;
};

export type AIProjectPlanResponse = {
  summary: string;
  tasks: AIGeneratedTask[];
  milestones: AIGeneratedMilestone[];
  warnings: string[];
};
