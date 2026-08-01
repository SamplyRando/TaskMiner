import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/api/client";
import { listProjects } from "@/api/projects";
import { assignTask, createTask, listAllTasks, listTasks } from "@/api/tasks";
import { getWorkspacePermissions } from "@/api/workspace-permissions";
import { listWorkspaces } from "@/api/workspace";
import { TasksPage } from "@/pages/tasks-page";
import { useAuthStore } from "@/store/auth-store";
import { useTaskViewStore } from "@/store/task-view-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { renderWithQuery } from "@/test/query-wrapper";
import {
  projectFixture,
  taskFixture,
  userId,
  workspaceFixture,
} from "@/test/resource-fixtures";

vi.mock("@/api/projects", () => ({
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  listProjects: vi.fn(),
  updateProject: vi.fn(),
}));

vi.mock("@/api/tasks", () => ({
  assignTask: vi.fn(),
  createTask: vi.fn(),
  deleteTask: vi.fn(),
  listAllTasks: vi.fn(),
  listTasks: vi.fn(),
  unassignTask: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock("@/api/workspace", () => ({
  createWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
  listWorkspaces: vi.fn(),
  updateWorkspace: vi.fn(),
}));

vi.mock("@/api/workspace-permissions", () => ({
  getWorkspacePermissions: vi.fn(),
}));

const mockedAssignTask = vi.mocked(assignTask);
const mockedCreateTask = vi.mocked(createTask);
const mockedListAllTasks = vi.mocked(listAllTasks);
const mockedListProjects = vi.mocked(listProjects);
const mockedListTasks = vi.mocked(listTasks);
const mockedListWorkspaces = vi.mocked(listWorkspaces);
const mockedPermissions = vi.mocked(getWorkspacePermissions);

describe("TasksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useTaskViewStore.setState({ mode: "list" });
    useWorkspaceStore.setState({ activeWorkspaceId: null });
    useAuthStore.setState({
      currentUser: {
        created_at: null,
        email: "ada@example.com",
        full_name: "Ada Lovelace",
        id: userId,
        is_active: true,
        updated_at: null,
      },
    });
    mockedListProjects.mockResolvedValue({
      items: [projectFixture],
      limit: 100,
      skip: 0,
      total: 1,
    });
    mockedListTasks.mockResolvedValue({
      items: [taskFixture],
      limit: 20,
      skip: 0,
      total: 1,
    });
    mockedListAllTasks.mockResolvedValue({
      items: [taskFixture],
      limit: 100,
      skip: 0,
      total: 1,
    });
    mockedListWorkspaces.mockResolvedValue([workspaceFixture]);
    mockedPermissions.mockResolvedValue({
      permissions: {
        manage_members: true,
        manage_projects: true,
        manage_tasks: true,
        manage_workspace: true,
        read: true,
      },
      role: "owner",
    });
  });

  it("loads tasks and applies server filters", async () => {
    const user = userEvent.setup();
    renderWithQuery(<TasksPage />);

    expect(await screen.findByText(taskFixture.title)).toBeInTheDocument();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filtrer par statut" }),
      "todo",
    );

    await waitFor(() => {
      expect(mockedListTasks).toHaveBeenLastCalledWith({
        limit: 20,
        skip: 0,
        sort: "-created_at",
        status: "todo",
        workspace_id: workspaceFixture.id,
      });
    });
  });

  it("keeps the view selector available when there are no tasks", async () => {
    const user = userEvent.setup();
    mockedListTasks.mockResolvedValue({
      items: [],
      limit: 20,
      skip: 0,
      total: 0,
    });
    mockedListAllTasks.mockResolvedValue({
      items: [],
      limit: 100,
      skip: 0,
      total: 0,
    });
    renderWithQuery(<TasksPage />);

    expect(
      await screen.findByRole("group", {
        name: "Mode d’affichage des tâches",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kanban" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Kanban" }));

    expect(
      await screen.findByText("Aucune tâche à afficher"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Liste" })).toBeEnabled();
  });

  it("creates a task in the selected project", async () => {
    const user = userEvent.setup();
    const createdTask = {
      ...taskFixture,
      id: "00000000-0000-4000-8000-000000000012",
      title: "Tâche Beta",
    };
    mockedCreateTask.mockResolvedValue(createdTask);
    renderWithQuery(<TasksPage />);

    await screen.findByText(taskFixture.title);
    await user.click(screen.getByRole("button", { name: "Nouvelle tâche" }));
    await user.type(
      screen.getByRole("textbox", { name: "Titre" }),
      "Tâche Beta",
    );
    await user.click(screen.getByRole("button", { name: "Créer" }));

    await waitFor(() => {
      expect(mockedCreateTask).toHaveBeenCalledWith(projectFixture.id, {
        description: null,
        due_date: null,
        priority: "medium",
        status: "todo",
        title: "Tâche Beta",
      });
    });
  });

  it("assigns a task to the authenticated user", async () => {
    const user = userEvent.setup();
    mockedAssignTask.mockResolvedValue({
      ...taskFixture,
      assigned_user_id: userId,
    });
    renderWithQuery(<TasksPage />);

    await screen.findByText(taskFixture.title);
    await user.click(
      screen.getByRole("button", { name: `Assigner ${taskFixture.title}` }),
    );
    await user.click(
      screen.getByRole("button", { name: "M’assigner cette tâche" }),
    );
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => {
      expect(mockedAssignTask).toHaveBeenCalledWith(taskFixture.id, userId);
    });
  });

  it("switches to the Kanban while preserving backend filters", async () => {
    const user = userEvent.setup();
    renderWithQuery(<TasksPage />);

    await screen.findByText(taskFixture.title);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filtrer par priorité" }),
      "medium",
    );
    await user.click(screen.getByRole("button", { name: "Kanban" }));

    expect(
      await screen.findByRole("region", { name: /À faire, 1 tâche/ }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(mockedListAllTasks).toHaveBeenLastCalledWith({
        priority: "medium",
        sort: "-created_at",
        workspace_id: workspaceFixture.id,
      });
    });
    expect(useTaskViewStore.getState().mode).toBe("kanban");
  });

  it("reloads Kanban projects and tasks when the workspace changes", async () => {
    const user = userEvent.setup();
    const secondWorkspace = {
      ...workspaceFixture,
      id: "00000000-0000-4000-8000-000000000099",
      name: "Workspace Beta",
    };
    mockedListWorkspaces.mockResolvedValue([workspaceFixture, secondWorkspace]);
    useTaskViewStore.setState({ mode: "kanban" });
    renderWithQuery(<TasksPage />);

    await screen.findByRole("region", { name: /À faire, 1 tâche/ });
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Workspace actif" }),
      secondWorkspace.id,
    );

    await waitFor(() => {
      expect(mockedListAllTasks).toHaveBeenLastCalledWith({
        sort: "-created_at",
        workspace_id: secondWorkspace.id,
      });
      expect(mockedListProjects).toHaveBeenLastCalledWith({
        limit: 100,
        skip: 0,
        sort: "name",
        workspace_id: secondWorkspace.id,
      });
    });
  });

  it("applies search, project, status and priority to the Kanban query", async () => {
    const user = userEvent.setup();
    renderWithQuery(<TasksPage />);

    await screen.findByText(taskFixture.title);
    await user.type(
      screen.getByRole("textbox", { name: "Rechercher une tâche" }),
      "Alpha",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filtrer par projet" }),
      projectFixture.id,
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filtrer par statut" }),
      "done",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filtrer par priorité" }),
      "urgent",
    );
    await user.click(screen.getByRole("button", { name: "Kanban" }));

    await waitFor(() => {
      expect(mockedListAllTasks).toHaveBeenLastCalledWith({
        priority: "urgent",
        project_id: projectFixture.id,
        search: "Alpha",
        sort: "-created_at",
        status: "done",
        workspace_id: workspaceFixture.id,
      });
    });
  });

  it("shows a Kanban API error and retries", async () => {
    const user = userEvent.setup();
    useTaskViewStore.setState({ mode: "kanban" });
    mockedListAllTasks
      .mockRejectedValueOnce(new ApiError("Kanban indisponible", 503))
      .mockResolvedValueOnce({
        items: [taskFixture],
        limit: 100,
        skip: 0,
        total: 1,
      });
    renderWithQuery(<TasksPage />);

    expect(await screen.findByText("Kanban indisponible")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(
      await screen.findByRole("region", { name: /À faire, 1 tâche/ }),
    ).toBeInTheDocument();
    expect(mockedListAllTasks).toHaveBeenCalledTimes(2);
  });
});
