import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createProject,
  deleteProject,
  listProjects,
  updateProject,
} from "@/api/projects";
import {
  assignTask,
  createTask,
  deleteTask,
  listTasks,
  unassignTask,
  updateTask,
} from "@/api/tasks";
import {
  createWorkspace,
  deleteWorkspace,
  listWorkspaces,
  updateWorkspace,
} from "@/api/workspace";
import { apiClient } from "@/api/client";
import {
  projectFixture,
  projectId,
  taskFixture,
  taskId,
  userId,
  workspaceFixture,
  workspaceId,
} from "@/test/resource-fixtures";

describe("resource API clients", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the existing workspace endpoints", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue({ data: [workspaceFixture] });
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ data: workspaceFixture });
    const patch = vi
      .spyOn(apiClient, "patch")
      .mockResolvedValue({ data: workspaceFixture });
    const remove = vi
      .spyOn(apiClient, "delete")
      .mockResolvedValue({ data: undefined });
    const input = { description: null, name: "Workspace Alpha" };

    await expect(listWorkspaces()).resolves.toEqual([workspaceFixture]);
    await createWorkspace(input);
    await updateWorkspace(workspaceId, input);
    await deleteWorkspace(workspaceId);

    expect(get).toHaveBeenCalledWith("/workspaces");
    expect(post).toHaveBeenCalledWith("/workspaces", input);
    expect(patch).toHaveBeenCalledWith(`/workspaces/${workspaceId}`, input);
    expect(remove).toHaveBeenCalledWith(`/workspaces/${workspaceId}`);
  });

  it("uses pagination parameters and the project CRUD endpoints", async () => {
    const page = { items: [projectFixture], limit: 20, skip: 0, total: 1 };
    const get = vi.spyOn(apiClient, "get").mockResolvedValue({ data: page });
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ data: projectFixture });
    const patch = vi
      .spyOn(apiClient, "patch")
      .mockResolvedValue({ data: projectFixture });
    const remove = vi
      .spyOn(apiClient, "delete")
      .mockResolvedValue({ data: undefined });
    const params = {
      limit: 20,
      search: "alpha",
      skip: 0,
      sort: "-created_at",
    } as const;
    const input = { description: null, name: "Projet Alpha" };

    await expect(listProjects(params)).resolves.toEqual(page);
    await createProject(input);
    await updateProject(projectId, input);
    await deleteProject(projectId);

    expect(get).toHaveBeenCalledWith("/projects", { params });
    expect(post).toHaveBeenCalledWith("/projects", input);
    expect(patch).toHaveBeenCalledWith(`/projects/${projectId}`, input);
    expect(remove).toHaveBeenCalledWith(`/projects/${projectId}`);
  });

  it("uses the task CRUD and assignment endpoints", async () => {
    const page = { items: [taskFixture], limit: 20, skip: 0, total: 1 };
    const get = vi.spyOn(apiClient, "get").mockResolvedValue({ data: page });
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ data: taskFixture });
    const patch = vi
      .spyOn(apiClient, "patch")
      .mockResolvedValue({ data: taskFixture });
    const remove = vi
      .spyOn(apiClient, "delete")
      .mockResolvedValue({ data: undefined });
    const params = {
      limit: 20,
      priority: "medium",
      project_id: projectId,
      skip: 0,
      sort: "-created_at",
      status: "todo",
    } as const;
    const input = {
      description: null,
      due_date: null,
      priority: "medium",
      status: "todo",
      title: "Tâche Alpha",
    } as const;

    await expect(listTasks(params)).resolves.toEqual(page);
    await createTask(projectId, input);
    await updateTask(taskId, input);
    await assignTask(taskId, userId);
    await unassignTask(taskId);
    await deleteTask(taskId);

    expect(get).toHaveBeenCalledWith("/tasks", { params });
    expect(post).toHaveBeenCalledWith(`/projects/${projectId}/tasks`, input);
    expect(patch).toHaveBeenNthCalledWith(1, `/tasks/${taskId}`, input);
    expect(patch).toHaveBeenNthCalledWith(2, `/tasks/${taskId}/assign`, {
      assigned_user_id: userId,
    });
    expect(remove).toHaveBeenCalledWith(`/tasks/${taskId}/assign`);
    expect(remove).toHaveBeenCalledWith(`/tasks/${taskId}`);
  });
});
