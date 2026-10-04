import type { PaginationState, SortingState } from "@tanstack/react-table";
import { AlertTriangle, Plus, Search, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DataTable } from "@/components/data-table/data-table";
import { DeleteDialog } from "@/components/delete-dialog";
import { EntityPageHeader } from "@/components/entity-page-header";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspaceSelector } from "@/components/workspace-selector";
import { exportProjectTemplate } from "@/api/projects";
import {
  useCreateProject,
  useDeleteProject,
  useDuplicateProject,
  useImportProjectTemplate,
  useProjects,
  useUpdateProject,
} from "@/features/projects/hooks";
import { getProjectColumns } from "@/features/projects/project-columns";
import { ProjectFormDialog } from "@/features/projects/project-form-dialog";
import { ProjectWorkflowDialog } from "@/features/projects/project-workflow-dialog";
import { useUserPreferences } from "@/features/settings/hooks";
import { useWorkspacePermissions } from "@/features/workspaces/permissions-hooks";
import { useWorkspaceSubscription } from "@/features/subscriptions/hooks";
import { getPlanLimitMessage } from "@/features/subscriptions/errors";
import { useActiveWorkspace } from "@/hooks/use-active-workspace";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSessionState } from "@/hooks/use-session-state";
import type { Project, ProjectInput, ProjectSort } from "@/types/project";

const initialPagination: PaginationState = { pageIndex: 0, pageSize: 20 };
const initialSorting: SortingState = [{ desc: true, id: "created_at" }];

function getSortParameter(sorting: SortingState): ProjectSort {
  const firstSort = sorting[0];
  const field =
    firstSort?.id === "name" ||
    firstSort?.id === "updated_at" ||
    firstSort?.id === "created_at"
      ? firstSort.id
      : "created_at";

  return `${firstSort?.desc === false ? "" : "-"}${field}` as ProjectSort;
}

export function ProjectsPage() {
  const workspace = useActiveWorkspace();
  const permissionsQuery = useWorkspacePermissions(workspace.activeWorkspaceId);
  const subscriptionQuery = useWorkspaceSubscription(
    workspace.activeWorkspaceId,
  );
  const canManageProjects =
    permissionsQuery.data?.permissions.manage_projects ?? false;
  const preferences = useUserPreferences();
  const pageSizeApplied = useRef(false);
  const importInput = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useSessionState("taskminer-projects-search", "");
  const deferredSearch = useDebouncedValue(search, 300);
  const [pagination, setPagination] = useSessionState(
    "taskminer-projects-pagination",
    initialPagination,
  );
  const [sorting, setSorting] = useSessionState<SortingState>(
    "taskminer-projects-sorting",
    initialSorting,
  );
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [workflowProject, setWorkflowProject] = useState<Project | null>(null);
  const [operationMessage, setOperationMessage] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const normalizedSearch = deferredSearch.trim();
  const projectLimitReached = Boolean(
    subscriptionQuery.data &&
    subscriptionQuery.data.usage.projects >=
      subscriptionQuery.data.limits.projects,
  );

  useEffect(() => {
    if (!preferences.data || pageSizeApplied.current) return;
    pageSizeApplied.current = true;
    setPagination((current) =>
      current.pageSize === preferences.data.items_per_page
        ? current
        : { pageIndex: 0, pageSize: preferences.data.items_per_page },
    );
  }, [preferences.data, setPagination]);

  const projectsQuery = useProjects(
    {
      limit: pagination.pageSize,
      skip: pagination.pageIndex * pagination.pageSize,
      sort: getSortParameter(sorting),
      ...(normalizedSearch ? { search: normalizedSearch } : {}),
      ...(workspace.activeWorkspaceId
        ? { workspace_id: workspace.activeWorkspaceId }
        : {}),
    },
    workspace.activeWorkspaceId !== null,
  );
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const duplicateProject = useDuplicateProject();
  const importTemplate = useImportProjectTemplate();

  const columns = useMemo(
    () =>
      getProjectColumns({
        canManage: canManageProjects,
        onDelete: (project) => {
          deleteProject.reset();
          setSelectedProject(project);
          setDeleteOpen(true);
        },
        onDuplicate: (project) => {
          setOperationMessage(null);
          setOperationError(null);
          void duplicateProject
            .mutateAsync(project.id)
            .then(() => {
              setOperationMessage("Projet dupliqué.");
            })
            .catch(() => undefined);
        },
        onEdit: (project) => {
          updateProject.reset();
          setSelectedProject(project);
          setFormOpen(true);
        },
        onExport: (project) => {
          setOperationError(null);
          void exportProjectTemplate(project.id)
            .then((template) => {
              const blob = new Blob([JSON.stringify(template, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `${project.name.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase()}-taskminer.json`;
              link.click();
              URL.revokeObjectURL(url);
            })
            .catch(() => {
              setOperationError("Le modèle n’a pas pu être exporté.");
            });
        },
        onWorkflow: (project) => {
          setWorkflowProject(project);
          setWorkflowOpen(true);
        },
      }),
    [canManageProjects, deleteProject, duplicateProject, updateProject],
  );

  const handleSubmit = async (data: ProjectInput) => {
    try {
      if (selectedProject) {
        await updateProject.mutateAsync({
          data,
          projectId: selectedProject.id,
        });
      } else {
        await createProject.mutateAsync({
          data,
          ...(workspace.activeWorkspaceId
            ? { workspaceId: workspace.activeWorkspaceId }
            : {}),
        });
      }
      setFormOpen(false);
    } catch {
      // L'erreur de mutation reste affichée dans la boîte de dialogue.
    }
  };

  const handleDelete = async () => {
    if (!selectedProject) {
      return;
    }

    try {
      await deleteProject.mutateAsync(selectedProject.id);
      setDeleteOpen(false);
      setSelectedProject(null);
    } catch {
      // L'erreur de mutation reste affichée dans la boîte de dialogue.
    }
  };
  const currentWorkflowProject =
    projectsQuery.data?.items.find(
      (project) => project.id === workflowProject?.id,
    ) ?? workflowProject;

  return (
    <div className="space-y-6">
      <EntityPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <input
              ref={importInput}
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file || !workspace.activeWorkspaceId) return;
                setOperationMessage(null);
                setOperationError(null);
                void importTemplate
                  .mutateAsync({
                    file,
                    workspaceId: workspace.activeWorkspaceId,
                  })
                  .then(() => {
                    setOperationMessage("Modèle importé.");
                  })
                  .catch(() => undefined);
                event.target.value = "";
              }}
              type="file"
            />
            <Button
              disabled={
                !canManageProjects ||
                projectLimitReached ||
                importTemplate.isPending
              }
              onClick={() => {
                importInput.current?.click();
              }}
              type="button"
              variant="outline"
            >
              <Upload aria-hidden="true" className="size-4" />
              Importer un modèle
            </Button>
            <Button
              disabled={!canManageProjects || projectLimitReached}
              onClick={() => {
                createProject.reset();
                setSelectedProject(null);
                setFormOpen(true);
              }}
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
              Nouveau projet
            </Button>
          </div>
        }
        description="Créez et suivez les projets de votre workspace."
        title="Projets"
      />

      <WorkspaceSelector
        disabled={workspace.isPending}
        onValueChange={(workspaceId) => {
          workspace.selectWorkspace(workspaceId);
          setPagination((current) => ({ ...current, pageIndex: 0 }));
        }}
        value={workspace.activeWorkspaceId}
        workspaces={workspace.workspaces}
      />

      {projectLimitReached ? (
        <p
          className="border-destructive/30 bg-destructive/5 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm"
          role="status"
        >
          <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
          Limite de {subscriptionQuery.data?.limits.projects} projets atteinte
          pour le plan {subscriptionQuery.data?.plan === "pro" ? "Pro" : "Free"}
          .
        </p>
      ) : null}
      {operationMessage ? (
        <p className="text-sm text-emerald-700" role="status">
          {operationMessage}
        </p>
      ) : null}
      {operationError || duplicateProject.isError || importTemplate.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {operationError ??
            getPlanLimitMessage(
              duplicateProject.error ?? importTemplate.error,
            ) ??
            "L’opération n’a pas pu être effectuée."}
        </p>
      ) : null}

      <div className="relative max-w-md">
        <Search
          aria-hidden="true"
          className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <Input
          aria-label="Rechercher un projet"
          className="pl-9"
          onChange={(event) => {
            setSearch(event.target.value);
            setPagination((current) => ({ ...current, pageIndex: 0 }));
          }}
          placeholder="Rechercher un projet…"
          value={search}
        />
      </div>

      {projectsQuery.isError ||
      workspace.isError ||
      permissionsQuery.isError ? (
        <ErrorState
          error={
            projectsQuery.error ?? workspace.error ?? permissionsQuery.error
          }
          onRetry={() => {
            void projectsQuery.refetch();
            void workspace.refetch();
            void permissionsQuery.refetch();
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={projectsQuery.data?.items ?? []}
          emptyAction={
            search || !canManageProjects || projectLimitReached ? undefined : (
              <Button
                onClick={() => {
                  createProject.reset();
                  setSelectedProject(null);
                  setFormOpen(true);
                }}
                type="button"
              >
                <Plus aria-hidden="true" className="size-4" />
                Créer un projet
              </Button>
            )
          }
          emptyDescription="Créez votre premier projet pour organiser vos tâches."
          emptyTitle={search ? "Aucun résultat" : "Aucun projet"}
          isLoading={projectsQuery.isPending}
          manualPagination
          manualSorting
          mobileLabels={{
            created_at: "Créé le",
            description: "Description",
            due_date: "Échéance",
            name: "Projet",
            workspace_name: "Workspace",
          }}
          onPaginationChange={setPagination}
          onSortingChange={(updater) => {
            setSorting(updater);
            setPagination((current) => ({ ...current, pageIndex: 0 }));
          }}
          pageCount={Math.ceil(
            (projectsQuery.data?.total ?? 0) / pagination.pageSize,
          )}
          pagination={pagination}
          sorting={sorting}
          total={projectsQuery.data?.total ?? 0}
        />
      )}

      <ProjectFormDialog
        error={selectedProject ? updateProject.error : createProject.error}
        errorMessage={
          selectedProject ? undefined : getPlanLimitMessage(createProject.error)
        }
        isPending={
          selectedProject ? updateProject.isPending : createProject.isPending
        }
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        open={formOpen}
        project={selectedProject}
      />

      <DeleteDialog
        description={`Le projet « ${selectedProject?.name ?? ""} » et ses tâches deviendront inaccessibles.`}
        error={deleteProject.error}
        isPending={deleteProject.isPending}
        onConfirm={handleDelete}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        title="Supprimer le projet ?"
      />
      {workflowOpen ? (
        <ProjectWorkflowDialog
          onOpenChange={setWorkflowOpen}
          open
          project={currentWorkflowProject}
        />
      ) : null}
    </div>
  );
}
