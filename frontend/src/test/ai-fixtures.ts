import type {
  AIApplyProjectChangePlanResponse,
  AIApplyProjectPlanResponse,
  AIProjectChangePlanResponse,
  AIProjectPlanResponse,
  AIWorkspaceUsage,
} from "@/types/ai";
import { projectId } from "@/test/resource-fixtures";

export const aiPlanFixture: AIProjectPlanResponse = {
  milestones: [
    {
      description: "The launch scope and success criteria are agreed.",
      name: "Scope confirmed",
      order: 1,
      suggested_due_date: "2026-08-20",
    },
  ],
  summary:
    "A structured launch plan covering scope, product preparation, quality validation, and go-to-market work.",
  tasks: [
    {
      depends_on: [],
      description:
        "Confirm the release objective, audience, constraints, and success criteria.",
      milestone: "Planning",
      order: 1,
      priority: "high",
      status: "todo",
      suggested_due_date: "2026-08-18",
      suggested_assignee_id: null,
      title: "Define launch scope",
    },
    {
      depends_on: [1],
      description: "Validate critical user journeys and release readiness.",
      milestone: "Validation",
      order: 2,
      priority: "urgent",
      status: "todo",
      suggested_due_date: "2026-08-26",
      suggested_assignee_id: null,
      title: "Run QA validation",
    },
  ],
  warnings: [],
};

export const aiSevenTaskPlanFixture: AIProjectPlanResponse = {
  ...aiPlanFixture,
  tasks: Array.from({ length: 7 }, (_, index) => {
    const order = index + 1;
    return {
      depends_on: order === 1 ? [] : [order - 1],
      description: `Generated description ${String(order)}`,
      milestone: order < 4 ? "Planning" : "Delivery",
      order,
      priority: order === 6 ? "urgent" : "high",
      status: "todo",
      suggested_due_date: `2026-08-${String(17 + order).padStart(2, "0")}`,
      suggested_assignee_id: null,
      title: `Generated task ${String(order)}`,
    };
  }),
};

export const aiApplyFixture: AIApplyProjectPlanResponse = {
  created_project: true,
  created_task_count: 2,
  created_assignment_count: 0,
  created_task_ids: [
    "20000000-0000-4000-8000-000000000001",
    "20000000-0000-4000-8000-000000000002",
  ],
  idempotent_replay: false,
  project_id: "10000000-0000-4000-8000-000000000001",
  skipped_task_count: 0,
  warnings: [],
};

export const aiUsageFixture: AIWorkspaceUsage = {
  average_latency_ms: 1850,
  estimated_cost_usd: 0.42,
  failed_requests: 2,
  input_tokens: 12345,
  output_tokens: 6789,
  period_end: "2026-09-01T00:00:00Z",
  period_start: "2026-08-01T00:00:00Z",
  pricing_configured: true,
  request_limit: 100,
  requests_remaining: 73,
  requests_used: 27,
  successful_requests: 25,
  total_tokens: 19134,
};

export const aiChangePlanFixture: AIProjectChangePlanResponse = {
  summary: "3 tâches à réviser dans le projet « TEST AI SPRINT 3 ».",
  project_id: projectId,
  warnings: [],
  changes: [
    {
      change_id: "40000000-0000-4000-8000-000000000001",
      entity_type: "task",
      task_id: "50000000-0000-4000-8000-000000000001",
      task_title: "API authentication",
      before: {
        title: "API authentication",
        description: "Authentication API",
        status: "todo",
        priority: "medium",
        due_date: "2026-09-20T12:00:00Z",
      },
      after: {
        title: "API authentication",
        description: "Authentication API",
        status: "todo",
        priority: "high",
        due_date: "2026-09-27T12:00:00Z",
      },
      changed_fields: ["priority", "due_date"],
      reason: "Priorité haute et échéance décalée de 7 jours.",
    },
    {
      change_id: "40000000-0000-4000-8000-000000000002",
      entity_type: "task",
      task_id: "50000000-0000-4000-8000-000000000002",
      task_title: "API payments",
      before: {
        title: "API payments",
        description: "Payments API",
        status: "in_progress",
        priority: "medium",
        due_date: "2026-09-22T12:00:00Z",
      },
      after: {
        title: "API payments",
        description: "Payments API",
        status: "in_progress",
        priority: "high",
        due_date: "2026-09-29T12:00:00Z",
      },
      changed_fields: ["priority", "due_date"],
      reason: "Priorité haute et échéance décalée de 7 jours.",
    },
    {
      change_id: "40000000-0000-4000-8000-000000000003",
      entity_type: "task",
      task_id: "50000000-0000-4000-8000-000000000003",
      task_title: "Préparer la documentation",
      before: {
        title: "Préparer la documentation",
        description: "Documentation",
        status: "todo",
        priority: "low",
        due_date: "2026-09-25T12:00:00Z",
      },
      after: {
        title: "Préparer la documentation",
        description: "Documentation",
        status: "in_progress",
        priority: "low",
        due_date: "2026-09-25T12:00:00Z",
      },
      changed_fields: ["status"],
      reason: "Statut proposé : in_progress.",
    },
  ],
};

export const aiChangeApplyFixture: AIApplyProjectChangePlanResponse = {
  project_id: projectId,
  modified_task_ids: [
    "50000000-0000-4000-8000-000000000001",
    "50000000-0000-4000-8000-000000000003",
  ],
  modified_task_count: 2,
  changed_field_count: 3,
  skipped_change_count: 1,
  idempotent_replay: false,
};
