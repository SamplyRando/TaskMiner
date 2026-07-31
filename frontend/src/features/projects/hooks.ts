import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createProject,
  deleteProject,
  listProjects,
  updateProject,
} from "@/api/projects";
import { workspaceKeys } from "@/features/workspaces/hooks";
import type { PaginatedResponse } from "@/types/pagination";
import type { Project, ProjectInput, ProjectListParams } from "@/types/project";

export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (params: ProjectListParams) =>
    [...projectKeys.lists(), params] as const,
};

export const useProjects = (params: ProjectListParams) =>
  useQuery({
    queryKey: projectKeys.list(params),
    queryFn: () => listProjects(params),
    placeholderData: keepPreviousData,
  });

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectKeys.all }),
        queryClient.invalidateQueries({ queryKey: workspaceKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
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
      ]);
    },
  });
};
