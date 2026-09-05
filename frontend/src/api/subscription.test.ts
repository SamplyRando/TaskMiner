import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import { getWorkspaceSubscription } from "@/api/subscription";
import { workspaceId } from "@/test/resource-fixtures";
import { freeSubscriptionFixture } from "@/test/subscription-fixtures";

describe("subscription API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads workspace plan state through the authenticated client", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue({ data: freeSubscriptionFixture });

    await expect(getWorkspaceSubscription(workspaceId)).resolves.toEqual(
      freeSubscriptionFixture,
    );
    expect(get).toHaveBeenCalledWith(`/workspaces/${workspaceId}/subscription`);
  });
});
