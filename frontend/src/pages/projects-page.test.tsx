import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createProject, listProjects } from "@/api/projects";
import { ProjectsPage } from "@/pages/projects-page";
import { renderWithQuery } from "@/test/query-wrapper";
import { projectFixture } from "@/test/resource-fixtures";

vi.mock("@/api/projects", () => ({
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  listProjects: vi.fn(),
  updateProject: vi.fn(),
}));

const mockedCreateProject = vi.mocked(createProject);
const mockedListProjects = vi.mocked(listProjects);

describe("ProjectsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        expect.anything(),
      );
    });
    expect(await screen.findByText("Projet Beta")).toBeInTheDocument();
  });
});
