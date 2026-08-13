import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/api/client";
import { generateProjectPlan } from "@/api/ai";
import { listProjects } from "@/api/projects";
import { listWorkspaces } from "@/api/workspace";
import { AIPage } from "@/pages/ai-page";
import { useWorkspaceStore } from "@/store/workspace-store";
import { aiPlanFixture } from "@/test/ai-fixtures";
import { renderWithQuery } from "@/test/query-wrapper";
import { projectFixture, workspaceFixture } from "@/test/resource-fixtures";

vi.mock("@/api/ai", () => ({ generateProjectPlan: vi.fn() }));
vi.mock("@/api/projects", () => ({
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  listProjects: vi.fn(),
  updateProject: vi.fn(),
}));
vi.mock("@/api/workspace", () => ({
  createWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
  listWorkspaces: vi.fn(),
  updateWorkspace: vi.fn(),
}));

const mockedGenerate = vi.mocked(generateProjectPlan);
const mockedListProjects = vi.mocked(listProjects);
const mockedListWorkspaces = vi.mocked(listWorkspaces);

describe("AIPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    useWorkspaceStore.setState({ activeWorkspaceId: workspaceFixture.id });
    mockedListWorkspaces.mockResolvedValue([workspaceFixture]);
    mockedListProjects.mockResolvedValue({
      items: [projectFixture],
      limit: 100,
      skip: 0,
      total: 1,
    });
    mockedGenerate.mockResolvedValue(aiPlanFixture);
  });

  it("renders the AI planner route content and workspace-scoped project query", async () => {
    renderWithQuery(<AIPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "TaskMiner AI" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Votre brouillon apparaîtra ici"),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(mockedListProjects).toHaveBeenCalledWith({
        limit: 100,
        skip: 0,
        sort: "name",
        workspace_id: workspaceFixture.id,
      });
    });
  });

  it("generates and displays a reviewable structured draft", async () => {
    const user = userEvent.setup();
    renderWithQuery(<AIPage />);
    await user.type(
      await screen.findByLabelText("Brief du projet"),
      "Prepare the mobile application launch before September.",
    );
    await user.click(screen.getByRole("button", { name: "Générer le plan" }));

    expect(await screen.findByText(aiPlanFixture.summary)).toBeInTheDocument();
    expect(screen.getByText("AI draft")).toBeInTheDocument();
    expect(screen.getByText("Define launch scope")).toBeInTheDocument();
    expect(screen.getByText("Run QA validation")).toBeInTheDocument();
    expect(screen.getByText("Haute")).toBeInTheDocument();
    expect(screen.getByText("Urgente")).toBeInTheDocument();
    expect(screen.getByText("Scope confirmed")).toBeInTheDocument();
    expect(screen.getByText("Proposition non enregistrée")).toBeInTheDocument();
    expect(mockedGenerate).toHaveBeenCalledWith(
      {
        project_id: null,
        prompt: "Prepare the mobile application launch before September.",
        target_date: null,
        workspace_id: workspaceFixture.id,
      },
      expect.anything(),
    );
  });

  it("shows an accessible loading state and prevents repeated submission", async () => {
    const user = userEvent.setup();
    mockedGenerate.mockReturnValue(new Promise(() => undefined));
    renderWithQuery(<AIPage />);
    await user.type(
      await screen.findByLabelText("Brief du projet"),
      "Prepare a structured customer onboarding project plan.",
    );
    await user.click(screen.getByRole("button", { name: "Générer le plan" }));

    const loadingButton = screen.getByRole("button", { name: /Génération/ });
    expect(loadingButton).toBeDisabled();
    expect(loadingButton).toHaveAttribute("aria-busy", "true");
    expect(mockedGenerate).toHaveBeenCalledTimes(1);
  });

  it("renders API errors without exposing implementation details", async () => {
    const user = userEvent.setup();
    mockedGenerate.mockRejectedValue(
      new ApiError("Workspace not found.", 404, {
        detail: "Workspace not found.",
      }),
    );
    renderWithQuery(<AIPage />);
    await user.type(
      await screen.findByLabelText("Brief du projet"),
      "Prepare a structured customer onboarding project plan.",
    );
    await user.click(screen.getByRole("button", { name: "Générer le plan" }));

    expect(await screen.findByText("Workspace not found.")).toBeInTheDocument();
    expect(screen.queryByText(/stack/i)).not.toBeInTheDocument();
  });

  it("supports repeated generation without persisting the previous draft", async () => {
    const user = userEvent.setup();
    renderWithQuery(<AIPage />);
    const prompt = await screen.findByLabelText("Brief du projet");
    await user.type(prompt, "Prepare the first structured project plan.");
    await user.click(screen.getByRole("button", { name: "Générer le plan" }));
    await screen.findByText(aiPlanFixture.summary);

    await user.clear(prompt);
    await user.type(prompt, "Prepare the revised structured project plan.");
    await user.click(screen.getByRole("button", { name: "Générer le plan" }));

    await waitFor(() => {
      expect(mockedGenerate).toHaveBeenCalledTimes(2);
    });
    expect(screen.getAllByText("AI draft")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Créer.*tâches/i })).toBeNull();
  });
});
