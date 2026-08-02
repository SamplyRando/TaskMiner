import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import { getDashboard, getDashboardProjects } from "@/api/dashboard";
import { dashboardFixture } from "@/test/dashboard-fixtures";

const params = { activity_limit: 8, period: "30d" as const };

describe("dashboard API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads the authenticated dashboard endpoint", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue({ data: dashboardFixture });

    await expect(getDashboard(params)).resolves.toEqual(dashboardFixture);
    expect(get).toHaveBeenCalledWith("/dashboard", { params });
  });

  it("loads a server-paginated dashboard project page", async () => {
    const page = {
      items: dashboardFixture.recent_projects,
      limit: 5,
      offset: 0,
      total: 1,
    };
    const projectParams = {
      limit: 5,
      offset: 0,
      period: "30d" as const,
      sort: "-created_at" as const,
    };
    const get = vi.spyOn(apiClient, "get").mockResolvedValue({ data: page });

    await expect(getDashboardProjects(projectParams)).resolves.toEqual(page);
    expect(get).toHaveBeenCalledWith("/dashboard/projects", {
      params: projectParams,
    });
  });
});
