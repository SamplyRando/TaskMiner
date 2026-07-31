import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types/pagination";
import type { Project, ProjectInput, ProjectListParams } from "@/types/project";

export const listProjects = async (
  params: ProjectListParams,
): Promise<PaginatedResponse<Project>> => {
  const response = await apiClient.get<PaginatedResponse<Project>>(
    "/projects",
    { params },
  );
  return response.data;
};

export const createProject = async (data: ProjectInput): Promise<Project> => {
  const response = await apiClient.post<Project>("/projects", data);
  return response.data;
};

export const updateProject = async (
  projectId: string,
  data: ProjectInput,
): Promise<Project> => {
  const response = await apiClient.patch<Project>(
    `/projects/${projectId}`,
    data,
  );
  return response.data;
};

export const deleteProject = async (projectId: string): Promise<void> => {
  await apiClient.delete(`/projects/${projectId}`);
};
