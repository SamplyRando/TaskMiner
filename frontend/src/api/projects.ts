import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types/pagination";
import type {
  Project,
  ProjectInput,
  ProjectListParams,
  ProjectTaskStatus,
  ProjectTemplate,
} from "@/types/project";

export const listProjects = async (
  params: ProjectListParams,
): Promise<PaginatedResponse<Project>> => {
  const response = await apiClient.get<PaginatedResponse<Project>>(
    "/projects",
    { params },
  );
  return response.data;
};

export const createProject = async (
  data: ProjectInput,
  workspaceId?: string,
): Promise<Project> => {
  const response = workspaceId
    ? await apiClient.post<Project>("/projects", data, {
        params: { workspace_id: workspaceId },
      })
    : await apiClient.post<Project>("/projects", data);
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

export const duplicateProject = async (projectId: string): Promise<Project> => {
  const response = await apiClient.post<Project>(
    `/projects/${projectId}/duplicate`,
  );
  return response.data;
};

export const exportProjectTemplate = async (
  projectId: string,
): Promise<ProjectTemplate> => {
  const response = await apiClient.get<ProjectTemplate>(
    `/projects/${projectId}/template`,
  );
  return response.data;
};

export const importProjectTemplate = async (
  workspaceId: string,
  file: File,
): Promise<Project> => {
  const form = new FormData();
  form.append("file", file);
  const response = await apiClient.post<Project>(
    "/projects/import-template",
    form,
    { params: { workspace_id: workspaceId } },
  );
  return response.data;
};

export const addProjectStatus = async (
  projectId: string,
  data: { label: string; is_completed?: boolean },
): Promise<ProjectTaskStatus> => {
  const response = await apiClient.post<ProjectTaskStatus>(
    `/projects/${projectId}/statuses`,
    data,
  );
  return response.data;
};

export const updateProjectStatus = async (
  projectId: string,
  key: string,
  data: { label?: string; is_completed?: boolean },
): Promise<ProjectTaskStatus> => {
  const response = await apiClient.patch<ProjectTaskStatus>(
    `/projects/${projectId}/statuses/${key}`,
    data,
  );
  return response.data;
};

export const reorderProjectStatuses = async (
  projectId: string,
  keys: string[],
): Promise<ProjectTaskStatus[]> => {
  const response = await apiClient.put<ProjectTaskStatus[]>(
    `/projects/${projectId}/statuses/reorder`,
    { keys },
  );
  return response.data;
};

export const deleteProjectStatus = async (
  projectId: string,
  key: string,
  replacementStatus?: string,
): Promise<void> => {
  await apiClient.delete(`/projects/${projectId}/statuses/${key}`, {
    params: replacementStatus
      ? { replacement_status: replacementStatus }
      : undefined,
  });
};
