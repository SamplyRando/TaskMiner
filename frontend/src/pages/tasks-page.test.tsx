import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listProjects } from "@/api/projects";
import { assignTask, createTask, listTasks } from "@/api/tasks";
import { TasksPage } from "@/pages/tasks-page";
import { useAuthStore } from "@/store/auth-store";
import { renderWithQuery } from "@/test/query-wrapper";
import { projectFixture, taskFixture, userId } from "@/test/resource-fixtures";

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
  listTasks: vi.fn(),
  unassignTask: vi.fn(),
  updateTask: vi.fn(),
}));

const mockedAssignTask = vi.mocked(assignTask);
const mockedCreateTask = vi.mocked(createTask);
const mockedListProjects = vi.mocked(listProjects);
const mockedListTasks = vi.mocked(listTasks);

describe("TasksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      });
    });
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
});
