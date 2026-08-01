import { beforeEach, describe, expect, it, vi } from "vitest";

import { listWorkspaceAudit } from "@/api/audit";
import { apiClient } from "@/api/client";
import { auditFeedFixture, firstWorkspace } from "@/test/activity-fixtures";

describe("audit API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("combines audit filters with server pagination", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue({ data: auditFeedFixture });
    const params = {
      event_type: "task_updated" as const,
      limit: 50,
      offset: 100,
      resource_type: "task" as const,
    };

    await expect(
      listWorkspaceAudit(firstWorkspace.id, params),
    ).resolves.toEqual(auditFeedFixture);
    expect(get).toHaveBeenCalledWith(`/workspaces/${firstWorkspace.id}/audit`, {
      params,
    });
  });

  it("supports audit pagination without optional filters", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue({ data: auditFeedFixture });
    const params = { limit: 20, offset: 20 };

    await listWorkspaceAudit(firstWorkspace.id, params);

    expect(get).toHaveBeenCalledWith(`/workspaces/${firstWorkspace.id}/audit`, {
      params,
    });
  });
});
