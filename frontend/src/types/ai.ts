import type { TaskPriority } from "@/types/task";

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
  suggested_due_date: string | null;
  milestone: string | null;
  order: number;
  depends_on: number[];
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
