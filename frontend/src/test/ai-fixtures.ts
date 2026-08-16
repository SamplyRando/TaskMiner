import type {
  AIApplyProjectPlanResponse,
  AIProjectPlanResponse,
} from "@/types/ai";

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
      title: `Generated task ${String(order)}`,
    };
  }),
};

export const aiApplyFixture: AIApplyProjectPlanResponse = {
  created_project: true,
  created_task_count: 2,
  created_task_ids: [
    "20000000-0000-4000-8000-000000000001",
    "20000000-0000-4000-8000-000000000002",
  ],
  idempotent_replay: false,
  project_id: "10000000-0000-4000-8000-000000000001",
  skipped_task_count: 0,
  warnings: [],
};
