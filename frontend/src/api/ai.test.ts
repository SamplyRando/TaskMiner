import { beforeEach, describe, expect, it, vi } from "vitest";

import { applyProjectPlan, generateProjectPlan } from "@/api/ai";
import { apiClient } from "@/api/client";
import { aiApplyFixture, aiPlanFixture } from "@/test/ai-fixtures";
import { projectId, workspaceId } from "@/test/resource-fixtures";

describe("TaskMiner AI API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the authenticated API client and structured project-plan contract", async () => {
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ data: aiPlanFixture });
    const request = {
      project_id: projectId,
      prompt: "Prepare the mobile application launch before September.",
      target_date: "2026-09-01",
      workspace_id: workspaceId,
    };

    await expect(generateProjectPlan(request)).resolves.toEqual(aiPlanFixture);
    expect(post).toHaveBeenCalledWith("/ai/project-plan", request);
  });

  it("applies only the explicitly approved plan through the mutation endpoint", async () => {
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ data: aiApplyFixture });
    const request = {
      idempotency_key: "30000000-0000-4000-8000-000000000001",
      project: { description: null, name: "Mobile launch" },
      project_id: null,
      source_task_count: 2,
      tasks: [
        {
          assigned_user_id: null,
          depends_on: [],
          description: "Reviewed task",
          due_date: null,
          milestone: "Planning",
          priority: "high" as const,
          source_order: 1,
          status: "todo" as const,
          title: "Define scope",
        },
      ],
      workspace_id: workspaceId,
    };

    await expect(applyProjectPlan(request)).resolves.toEqual(aiApplyFixture);
    expect(post).toHaveBeenCalledWith("/ai/project-plan/apply", request);
  });
});
