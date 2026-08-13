import type { AIProjectPlanResponse } from "@/types/ai";

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
      suggested_due_date: "2026-08-18",
      title: "Define launch scope",
    },
    {
      depends_on: [1],
      description: "Validate critical user journeys and release readiness.",
      milestone: "Validation",
      order: 2,
      priority: "urgent",
      suggested_due_date: "2026-08-26",
      title: "Run QA validation",
    },
  ],
  warnings: [],
};
