import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  addProjectStatus,
  createProject,
  deleteProjectStatus,
  deleteProject,
  duplicateProject,
  importProjectTemplate,
  listProjects,
  reorderProjectStatuses,
  updateProjectStatus,
  updateProject,
} from "@/api/projects";
import { workspaceKeys } from "@/features/workspaces/hooks";
import { subscriptionKeys } from "@/features/subscriptions/hooks";
import type { PaginatedResponse } from "@/types/pagination";
import type { Project, ProjectInput, ProjectListParams } from "@/types/project";

export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (params: ProjectListParams) =>
    [...projectKeys.lists(), params] as const,
};

export const useProjects = (params: ProjectListParams, enabled = true) =>
  useQuery({
    enabled,
    queryKey: projectKeys.list(params),
    queryFn: () => listProjects(params),
    placeholderData: keepPreviousData,
  });

type CreateProjectVariables = {
  data: ProjectInput;
  workspaceId?: string;
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data, workspaceId }: CreateProjectVariables) =>
      createProject(data, workspaceId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectKeys.all }),
        queryClient.invalidateQueries({ queryKey: workspaceKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: subscriptionKeys.all }),
      ]);
    },
  });
};

type UpdateProjectVariables = {
  projectId: string;
  data: ProjectInput;
};

type ProjectQueriesSnapshot = [
  readonly unknown[],
  PaginatedResponse<Project> | undefined,
][];

const restoreProjectQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  snapshot: ProjectQueriesSnapshot,
): void => {
  snapshot.forEach(([queryKey, data]) => {
    queryClient.setQueryData(queryKey, data);
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data, projectId }: UpdateProjectVariables) =>
      updateProject(projectId, data),
    onMutate: async ({ data, projectId }) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.lists() });
      const previous = queryClient.getQueriesData<PaginatedResponse<Project>>({
        queryKey: projectKeys.lists(),
      });
      queryClient.setQueriesData<PaginatedResponse<Project>>(
        { queryKey: projectKeys.lists() },
        (current) =>
          current
            ? {
                ...current,
                items: current.items.map((project) =>
                  project.id === projectId ? { ...project, ...data } : project,
                ),
              }
            : current,
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        restoreProjectQueries(queryClient, context.previous);
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProject,
    onMutate: async (projectId) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.lists() });
      const previous = queryClient.getQueriesData<PaginatedResponse<Project>>({
        queryKey: projectKeys.lists(),
      });
      queryClient.setQueriesData<PaginatedResponse<Project>>(
        { queryKey: projectKeys.lists() },
        (current) =>
          current
            ? {
                ...current,
                items: current.items.filter(
                  (project) => project.id !== projectId,
                ),
                total: Math.max(0, current.total - 1),
              }
            : current,
      );
      return { previous };
    },
    onError: (_error, _projectId, context) => {
      if (context?.previous) {
        restoreProjectQueries(queryClient, context.previous);
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: subscriptionKeys.all }),
      ]);
    },
  });
};

const invalidateProjectCreation = async (
  queryClient: ReturnType<typeof useQueryClient>,
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: projectKeys.all }),
    queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.all }),
  ]);
};

export const useDuplicateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: duplicateProject,
    onSuccess: () => invalidateProjectCreation(queryClient),
  });
};

export const useImportProjectTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, workspaceId }: { file: File; workspaceId: string }) =>
      importProjectTemplate(workspaceId, file),
    onSuccess: () => invalidateProjectCreation(queryClient),
  });
};

export const useAddProjectStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      isCompleted,
      label,
      projectId,
    }: {
      isCompleted?: boolean;
      label: string;
      projectId: string;
    }) =>
      addProjectStatus(projectId, {
        label,
        ...(isCompleted === undefined ? {} : { is_completed: isCompleted }),
      }),
    onSuccess: () => invalidateProjectCreation(queryClient),
  });
};

export const useUpdateProjectStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      key,
      projectId,
    }: {
      data: { label?: string; is_completed?: boolean };
      key: string;
      projectId: string;
    }) => updateProjectStatus(projectId, key, data),
    onSuccess: () => invalidateProjectCreation(queryClient),
  });
};

export const useReorderProjectStatuses = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ keys, projectId }: { keys: string[]; projectId: string }) =>
      reorderProjectStatuses(projectId, keys),
    onSuccess: () => invalidateProjectCreation(queryClient),
  });
};

export const useDeleteProjectStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      key,
      projectId,
      replacementStatus,
    }: {
      key: string;
      projectId: string;
      replacementStatus?: string;
    }) => deleteProjectStatus(projectId, key, replacementStatus),
    onSuccess: () => invalidateProjectCreation(queryClient),
  });
};
