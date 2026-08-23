import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createProject, listProjects } from "@/api/projects";
import { getUserPreferences } from "@/api/settings";
import { getWorkspacePermissions } from "@/api/workspace-permissions";
import { listWorkspaces } from "@/api/workspace";
import { ProjectsPage } from "@/pages/projects-page";
import { renderWithQuery } from "@/test/query-wrapper";
import { projectFixture, workspaceFixture } from "@/test/resource-fixtures";
import { settingsPreferencesFixture } from "@/test/settings-fixtures";
import { useWorkspaceStore } from "@/store/workspace-store";

vi.mock("@/api/projects", () => ({
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  listProjects: vi.fn(),
  updateProject: vi.fn(),
}));
vi.mock("@/api/settings", () => ({ getUserPreferences: vi.fn() }));
vi.mock("@/api/workspace", () => ({ listWorkspaces: vi.fn() }));
vi.mock("@/api/workspace-permissions", () => ({
  getWorkspacePermissions: vi.fn(),
}));

const mockedCreateProject = vi.mocked(createProject);
const mockedListProjects = vi.mocked(listProjects);
const mockedGetPreferences = vi.mocked(getUserPreferences);
const mockedListWorkspaces = vi.mocked(listWorkspaces);
const mockedPermissions = vi.mocked(getWorkspacePermissions);

describe("ProjectsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.setState({ activeWorkspaceId: null });
    mockedGetPreferences.mockResolvedValue(settingsPreferencesFixture);
    mockedListWorkspaces.mockResolvedValue([workspaceFixture]);
    mockedPermissions.mockResolvedValue({
      permissions: {
        manage_invitations: true,
        manage_members: true,
        manage_projects: true,
        manage_tasks: true,
        manage_workspace: true,
        read: true,
      },
      role: "owner",
    });
    mockedListProjects.mockResolvedValue({
      items: [projectFixture],
      limit: 20,
      skip: 0,
      total: 1,
    });
  });

  it("loads projects with server pagination and sorting", async () => {
    renderWithQuery(<ProjectsPage />);

    expect(await screen.findByText(projectFixture.name)).toBeInTheDocument();
    expect(mockedListProjects).toHaveBeenCalledWith({
      limit: 20,
      skip: 0,
      sort: "-created_at",
      workspace_id: workspaceFixture.id,
    });
  });

  it("creates a project and invalidates the list", async () => {
    const user = userEvent.setup();
    const createdProject = {
      ...projectFixture,
      id: "00000000-0000-4000-8000-000000000011",
      name: "Projet Beta",
    };
    mockedCreateProject.mockResolvedValue(createdProject);
    mockedListProjects
      .mockResolvedValueOnce({
        items: [projectFixture],
        limit: 20,
        skip: 0,
        total: 1,
      })
      .mockResolvedValue({
        items: [createdProject, projectFixture],
        limit: 20,
        skip: 0,
        total: 2,
      });
    renderWithQuery(<ProjectsPage />);

    await screen.findByText(projectFixture.name);
    await user.click(screen.getByRole("button", { name: "Nouveau projet" }));
    await user.type(
      screen.getByRole("textbox", { name: "Nom" }),
      "Projet Beta",
    );
    await user.click(screen.getByRole("button", { name: "Créer" }));

    await waitFor(() => {
      expect(mockedCreateProject).toHaveBeenCalledWith(
        {
          description: null,
          name: "Projet Beta",
        },
        workspaceFixture.id,
      );
    });
    expect(await screen.findByText("Projet Beta")).toBeInTheDocument();
  });

  it("keeps shared projects readable without exposing mutations to viewers", async () => {
    mockedPermissions.mockResolvedValue({
      permissions: {
        manage_invitations: false,
        manage_members: false,
        manage_projects: false,
        manage_tasks: false,
        manage_workspace: false,
        read: true,
      },
      role: "viewer",
    });

    renderWithQuery(<ProjectsPage />);

    expect(await screen.findByText(projectFixture.name)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Nouveau projet" }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", {
        name: `Modifier ${projectFixture.name}`,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: `Supprimer ${projectFixture.name}`,
      }),
    ).not.toBeInTheDocument();
  });
});
