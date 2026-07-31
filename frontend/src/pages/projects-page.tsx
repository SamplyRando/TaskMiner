import type { PaginationState, SortingState } from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable } from "@/components/data-table/data-table";
import { DeleteDialog } from "@/components/delete-dialog";
import { EntityPageHeader } from "@/components/entity-page-header";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useUpdateProject,
} from "@/features/projects/hooks";
import { getProjectColumns } from "@/features/projects/project-columns";
import { ProjectFormDialog } from "@/features/projects/project-form-dialog";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
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
  const [search, setSearch] = useState("");
  const deferredSearch = useDebouncedValue(search, 300);
  const [pagination, setPagination] = useState(initialPagination);
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const normalizedSearch = deferredSearch.trim();

  const projectsQuery = useProjects({
    limit: pagination.pageSize,
    skip: pagination.pageIndex * pagination.pageSize,
    sort: getSortParameter(sorting),
    ...(normalizedSearch ? { search: normalizedSearch } : {}),
  });
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const columns = useMemo(
    () =>
      getProjectColumns({
        onDelete: (project) => {
          deleteProject.reset();
          setSelectedProject(project);
          setDeleteOpen(true);
        },
        onEdit: (project) => {
          updateProject.reset();
          setSelectedProject(project);
          setFormOpen(true);
        },
      }),
    [deleteProject, updateProject],
  );

  const handleSubmit = async (data: ProjectInput) => {
    try {
      if (selectedProject) {
        await updateProject.mutateAsync({
          data,
          projectId: selectedProject.id,
        });
      } else {
        await createProject.mutateAsync(data);
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

  return (
    <div className="space-y-6">
      <EntityPageHeader
        actions={
          <Button
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
        }
        description="Créez et suivez les projets de votre workspace."
        title="Projets"
      />

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

      {projectsQuery.isError ? (
        <ErrorState
          error={projectsQuery.error}
          onRetry={() => void projectsQuery.refetch()}
        />
      ) : (
        <DataTable
          columns={columns}
          data={projectsQuery.data?.items ?? []}
          emptyDescription="Créez votre premier projet pour organiser vos tâches."
          emptyTitle={search ? "Aucun résultat" : "Aucun projet"}
          isLoading={projectsQuery.isPending}
          manualPagination
          manualSorting
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
    </div>
  );
}
