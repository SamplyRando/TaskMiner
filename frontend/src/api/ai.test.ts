import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateProjectPlan } from "@/api/ai";
import { apiClient } from "@/api/client";
import { aiPlanFixture } from "@/test/ai-fixtures";
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
});
