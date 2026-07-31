import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import { getDashboard } from "@/api/dashboard";
import { dashboardFixture } from "@/test/dashboard-fixtures";

describe("dashboard API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads the authenticated dashboard endpoint", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue({ data: dashboardFixture });

    await expect(getDashboard()).resolves.toEqual(dashboardFixture);
    expect(get).toHaveBeenCalledWith("/dashboard");
  });
});
