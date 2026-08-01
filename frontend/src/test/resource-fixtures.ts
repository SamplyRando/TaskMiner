import type { Project } from "@/types/project";
import type { Task } from "@/types/task";
import type { Workspace } from "@/types/workspace";

export const userId = "00000000-0000-4000-8000-000000000001";
export const workspaceId = "00000000-0000-4000-8000-000000000002";
export const projectId = "00000000-0000-4000-8000-000000000003";
export const taskId = "00000000-0000-4000-8000-000000000004";

export const workspaceFixture: Workspace = {
  created_at: "2026-07-31T08:00:00Z",
  description: "Workspace de test",
  id: workspaceId,
  name: "Workspace Alpha",
  owner_id: userId,
  updated_at: "2026-07-31T08:00:00Z",
};

export const projectFixture: Project = {
  created_at: "2026-07-31T08:30:00Z",
  description: "Projet de test",
  id: projectId,
  name: "Projet Alpha",
  owner_id: userId,
  updated_at: "2026-07-31T08:30:00Z",
  workspace_id: workspaceId,
};

export const taskFixture: Task = {
  assigned_user_id: null,
  created_at: "2026-07-31T09:00:00Z",
  description: "Tâche de test",
  due_date: null,
  id: taskId,
  priority: "medium",
  project_id: projectId,
  status: "todo",
  title: "Tâche Alpha",
  updated_at: "2026-07-31T09:00:00Z",
};
