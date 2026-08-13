import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listProjects } from "@/api/projects";
import { getUserPreferences } from "@/api/settings";
import { listWorkspaces } from "@/api/workspace";
import { AppRouter } from "@/routes/app-router";
import { authenticateStore, fakeUser } from "@/test/auth-fixtures";
import { renderWithQuery } from "@/test/query-wrapper";
import { projectFixture, workspaceFixture } from "@/test/resource-fixtures";
import { settingsPreferencesFixture } from "@/test/settings-fixtures";

vi.mock("@/api/projects", () => ({
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  listProjects: vi.fn(),
  updateProject: vi.fn(),
}));
vi.mock("@/api/settings", () => ({ getUserPreferences: vi.fn() }));
vi.mock("@/api/workspace", () => ({
  createWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
  listWorkspaces: vi.fn(),
  updateWorkspace: vi.fn(),
}));

describe("TaskMiner AI application route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authenticateStore(fakeUser);
    vi.mocked(getUserPreferences).mockResolvedValue(settingsPreferencesFixture);
    vi.mocked(listWorkspaces).mockResolvedValue([workspaceFixture]);
    vi.mocked(listProjects).mockResolvedValue({
      items: [projectFixture],
      limit: 100,
      skip: 0,
      total: 1,
    });
  });

  it("renders the protected /app/ai route", async () => {
    renderWithQuery(
      <MemoryRouter initialEntries={["/app/ai"]}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "TaskMiner AI" }),
    ).toBeInTheDocument();
  });
});
