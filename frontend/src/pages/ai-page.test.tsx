import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/api/client";
import { applyProjectPlan, generateProjectPlan } from "@/api/ai";
import { listProjects } from "@/api/projects";
import { listWorkspaces } from "@/api/workspace";
import { AIPage } from "@/pages/ai-page";
import { useWorkspaceStore } from "@/store/workspace-store";
import {
  aiApplyFixture,
  aiPlanFixture,
  aiSevenTaskPlanFixture,
} from "@/test/ai-fixtures";
import { renderWithQuery } from "@/test/query-wrapper";
import { projectFixture, workspaceFixture } from "@/test/resource-fixtures";

vi.mock("@/api/ai", () => ({
  applyProjectPlan: vi.fn(),
  generateProjectPlan: vi.fn(),
}));
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
const mockedApply = vi.mocked(applyProjectPlan);
const mockedListProjects = vi.mocked(listProjects);
const mockedListWorkspaces = vi.mocked(listWorkspaces);

describe("AIPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    useWorkspaceStore.setState({ activeWorkspaceId: workspaceFixture.id });
    mockedListWorkspaces.mockResolvedValue([workspaceFixture]);
    mockedListProjects.mockResolvedValue({
      items: [projectFixture],
      limit: 100,
      skip: 0,
      total: 1,
    });
    mockedGenerate.mockResolvedValue(aiPlanFixture);
    mockedApply.mockResolvedValue(aiApplyFixture);
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
    expect(screen.getByDisplayValue("Define launch scope")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Run QA validation")).toBeInTheDocument();
    const priorities = screen.getAllByLabelText("Priorité");
    expect(priorities[0]).toHaveValue("high");
    expect(priorities[1]).toHaveValue("urgent");
    expect(screen.getByText("Scope confirmed")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Les modifications ci-dessous concernent uniquement le brouillon IA/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nom du projet")).toHaveValue(
      "Prepare the mobile application launch before September",
    );
    expect(mockedApply).not.toHaveBeenCalled();
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
    expect(mockedApply).not.toHaveBeenCalled();
  });

  it("applies after confirmation and renders a stable success state", async () => {
    const user = userEvent.setup();
    renderWithQuery(
      <MemoryRouter>
        <AIPage />
      </MemoryRouter>,
    );
    await user.type(
      await screen.findByLabelText("Brief du projet"),
      "Prepare the mobile application launch before September.",
    );
    await user.click(screen.getByRole("button", { name: "Générer le plan" }));
    const applyButton = await screen.findByRole("button", {
      name: "Appliquer le plan",
    });
    await waitFor(() => {
      expect(applyButton).toBeEnabled();
    });
    await user.click(applyButton);
    await user.click(
      screen.getByRole("button", { name: "Confirmer et créer" }),
    );

    expect(
      await screen.findByText("Plan appliqué avec succès"),
    ).toBeInTheDocument();
    expect(mockedApply).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("AI draft")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Prepare the mobile application/),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Créer un nouveau plan" }),
    );
    expect(
      screen.getByText("Votre brouillon apparaîtra ici"),
    ).toBeInTheDocument();
    expect(sessionStorage.getItem("taskminer-ai-apply-draft-v1")).toBe("null");
  });

  it("submits every edited selected task from a seven-task existing-project draft", async () => {
    const user = userEvent.setup();
    mockedGenerate.mockResolvedValue(aiSevenTaskPlanFixture);
    mockedApply.mockResolvedValue({
      ...aiApplyFixture,
      created_project: false,
      created_task_count: 6,
      created_task_ids: Array.from(
        { length: 6 },
        (_, index) => `20000000-0000-4000-8000-00000000000${String(index + 1)}`,
      ),
      project_id: projectFixture.id,
      skipped_task_count: 1,
    });
    renderWithQuery(
      <MemoryRouter>
        <AIPage />
      </MemoryRouter>,
    );
    const projectSelect = await screen.findByLabelText(/Projet/);
    await waitFor(() => {
      expect(projectSelect).toBeEnabled();
      expect(
        screen.getByRole("option", { name: projectFixture.name }),
      ).toBeInTheDocument();
    });
    await user.selectOptions(projectSelect, projectFixture.id);
    await user.type(
      screen.getByLabelText("Brief du projet"),
      "Prepare the full TaskMiner AI apply validation plan.",
    );
    await user.click(screen.getByRole("button", { name: "Générer le plan" }));

    const firstTitle = (await screen.findAllByLabelText(/Titre/))[0];
    if (!firstTitle) throw new Error("Expected the first generated task title");
    await user.clear(firstTitle);
    await user.type(firstTitle, "TEST IA - Définir le périmètre");
    await user.click(screen.getByLabelText("Inclure la tâche 7"));

    expect(screen.getByText("6 sur 7 sélectionnées")).toBeInTheDocument();
    expect(
      screen.getByText(
        `6 tâches seront créées dans « ${projectFixture.name} ».`,
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Appliquer le plan" }));
    expect(
      screen.getByText(
        `Vous allez ajouter 6 tâches au projet « ${projectFixture.name} ». Cette action modifiera TaskMiner.`,
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(mockedApply).not.toHaveBeenCalled();
    expect(screen.getByText("6 sur 7 sélectionnées")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("TEST IA - Définir le périmètre"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Appliquer le plan" }));
    await user.click(
      screen.getByRole("button", { name: "Confirmer et créer" }),
    );

    await waitFor(() => {
      expect(mockedApply).toHaveBeenCalledTimes(1);
    });
    const request = mockedApply.mock.calls[0]?.[0];
    expect(request?.project_id).toBe(projectFixture.id);
    expect(request?.project).toBeNull();
    expect(request?.source_task_count).toBe(7);
    expect(request?.tasks).toHaveLength(6);
    expect(request?.tasks.map((task) => task.source_order)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    expect(request?.tasks[0]?.title).toBe("TEST IA - Définir le périmètre");
    expect(request?.tasks.some((task) => task.source_order === 7)).toBe(false);
  });

  it("restores an edited unapplied draft after leaving the AI page", async () => {
    const user = userEvent.setup();
    mockedGenerate.mockResolvedValue(aiSevenTaskPlanFixture);
    const firstRender = renderWithQuery(<AIPage />);
    await user.type(
      await screen.findByLabelText("Brief du projet"),
      "Prepare a persistent review draft for navigation testing.",
    );
    await user.click(screen.getByRole("button", { name: "Générer le plan" }));
    const firstTitle = (await screen.findAllByLabelText(/Titre/))[0];
    if (!firstTitle) throw new Error("Expected the first generated task title");
    await user.clear(firstTitle);
    await user.type(firstTitle, "Brouillon conservé après navigation");
    await user.click(screen.getByLabelText("Inclure la tâche 7"));
    await waitFor(() => {
      expect(sessionStorage.getItem("taskminer-ai-apply-draft-v1")).toContain(
        "Brouillon conservé après navigation",
      );
    });
    firstRender.unmount();

    renderWithQuery(<AIPage />);

    expect(
      await screen.findByDisplayValue("Brouillon conservé après navigation"),
    ).toBeInTheDocument();
    expect(screen.getByText("6 sur 7 sélectionnées")).toBeInTheDocument();
    expect(mockedGenerate).toHaveBeenCalledTimes(1);
    expect(mockedApply).not.toHaveBeenCalled();
  });
});
