import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyProjectChangePlan,
  applyProjectPlan,
  generateProjectChangePlan,
  generateProjectPlan,
  getAICapabilities,
  getAIWorkspaceUsage,
} from "@/api/ai";
import { apiClient } from "@/api/client";
import {
  aiApplyFixture,
  aiChangeApplyFixture,
  aiChangePlanFixture,
  aiPlanFixture,
  aiUsageFixture,
} from "@/test/ai-fixtures";
import { projectId, workspaceId } from "@/test/resource-fixtures";

describe("TaskMiner AI API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads safe provider capabilities through the authenticated client", async () => {
    const capabilities = {
      project_editing: true,
      project_planning: true,
      provider: "openai" as const,
      provider_label: "OpenAI",
    };
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue({ data: capabilities });

    await expect(getAICapabilities()).resolves.toEqual(capabilities);
    expect(get).toHaveBeenCalledWith("/ai/capabilities");
  });

  it("loads workspace AI usage through the authenticated client", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue({ data: aiUsageFixture });

    await expect(getAIWorkspaceUsage(workspaceId)).resolves.toEqual(
      aiUsageFixture,
    );
    expect(get).toHaveBeenCalledWith(`/workspaces/${workspaceId}/ai/usage`);
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
    expect(post).toHaveBeenCalledWith("/ai/project-plan", request, {
      timeout: 60_000,
    });
  });

  it("keeps project-plan apply on the normal client timeout", async () => {
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

  it("generates a read-only project change plan", async () => {
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ data: aiChangePlanFixture });
    const request = {
      workspace_id: workspaceId,
      project_id: projectId,
      instruction: "Décale toutes les tâches API d’une semaine.",
    };

    await expect(generateProjectChangePlan(request)).resolves.toEqual(
      aiChangePlanFixture,
    );
    expect(post).toHaveBeenCalledWith("/ai/project-change-plan", request, {
      timeout: 60_000,
    });
  });

  it("keeps project-change apply on the normal client timeout", async () => {
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ data: aiChangeApplyFixture });
    const change = aiChangePlanFixture.changes[0];
    if (!change) throw new Error("Expected a change fixture");
    const request = {
      workspace_id: workspaceId,
      project_id: projectId,
      source_change_count: 3,
      changes: [
        {
          change_id: change.change_id,
          task_id: change.task_id,
          before: change.before,
          after: change.after,
          changed_fields: change.changed_fields,
        },
      ],
      idempotency_key: "60000000-0000-4000-8000-000000000001",
    };

    await expect(applyProjectChangePlan(request)).resolves.toEqual(
      aiChangeApplyFixture,
    );
    expect(post).toHaveBeenCalledWith("/ai/project-change-plan/apply", request);
  });
});
