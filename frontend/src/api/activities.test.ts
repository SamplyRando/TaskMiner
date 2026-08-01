import { beforeEach, describe, expect, it, vi } from "vitest";

import { listWorkspaceActivities } from "@/api/activities";
import { apiClient } from "@/api/client";
import { activityFeedFixture, firstWorkspace } from "@/test/activity-fixtures";

describe("activities API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends workspace pagination parameters to the existing endpoint", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue({ data: activityFeedFixture });
    const params = { limit: 20, offset: 40 };

    await expect(
      listWorkspaceActivities(firstWorkspace.id, params),
    ).resolves.toEqual(activityFeedFixture);
    expect(get).toHaveBeenCalledWith(
      `/workspaces/${firstWorkspace.id}/activities`,
      { params },
    );
  });
});
