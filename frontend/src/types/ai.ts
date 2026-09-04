import type { TaskPriority, TaskStatus } from "@/types/task";

export type AICapabilities = {
  project_planning: boolean;
  project_editing: boolean;
  provider: "mock" | "openai";
  provider_label: string;
};

export type AIWorkspaceUsage = {
  period_start: string;
  period_end: string;
  request_limit: number;
  requests_used: number;
  requests_remaining: number;
  successful_requests: number;
  failed_requests: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  pricing_configured: boolean;
  average_latency_ms: number | null;
};

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
  suggested_assignee_id: string | null;
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
  created_assignment_count: number;
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

export type AIChangeField =
  "title" | "description" | "status" | "priority" | "due_date";

export type AITaskChangeState = {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
};

export type AIProjectChangePlanRequest = {
  workspace_id: string;
  project_id: string;
  instruction: string;
};

export type AIProjectTaskChange = {
  change_id: string;
  entity_type: "task";
  task_id: string;
  task_title: string;
  before: AITaskChangeState;
  after: AITaskChangeState;
  changed_fields: AIChangeField[];
  reason: string;
};

export type AIProjectChangePlanResponse = {
  summary: string;
  project_id: string;
  changes: AIProjectTaskChange[];
  warnings: string[];
};

export type AIApprovedTaskChange = {
  change_id: string;
  task_id: string;
  before: AITaskChangeState;
  after: AITaskChangeState;
  changed_fields: AIChangeField[];
};

export type AIApplyProjectChangePlanRequest = {
  workspace_id: string;
  project_id: string;
  source_change_count: number;
  changes: AIApprovedTaskChange[];
  idempotency_key: string;
};

export type AIApplyProjectChangePlanResponse = {
  project_id: string;
  modified_task_ids: string[];
  modified_task_count: number;
  changed_field_count: number;
  skipped_change_count: number;
  idempotent_replay: boolean;
};
