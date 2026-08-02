import type { PaginationState, SortingState } from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DataTable } from "@/components/data-table/data-table";
import { DeleteDialog } from "@/components/delete-dialog";
import { EntityPageHeader } from "@/components/entity-page-header";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserPreferences } from "@/features/settings/hooks";
import {
  useCreateWorkspace,
  useDeleteWorkspace,
  useUpdateWorkspace,
  useWorkspaces,
} from "@/features/workspaces/hooks";
import { getWorkspaceColumns } from "@/features/workspaces/workspace-columns";
import { WorkspaceFormDialog } from "@/features/workspaces/workspace-form-dialog";
import type { Workspace, WorkspaceInput } from "@/types/workspace";

const initialPagination: PaginationState = { pageIndex: 0, pageSize: 20 };

export function WorkspacePage() {
  const preferences = useUserPreferences();
  const pageSizeApplied = useRef(false);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState(initialPagination);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(
    null,
  );

  useEffect(() => {
    if (!preferences.data || pageSizeApplied.current) return;
    pageSizeApplied.current = true;
    setPagination((current) =>
      current.pageSize === preferences.data.items_per_page
        ? current
        : { pageIndex: 0, pageSize: preferences.data.items_per_page },
    );
  }, [preferences.data]);

  const workspacesQuery = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const updateWorkspace = useUpdateWorkspace();
  const deleteWorkspace = useDeleteWorkspace();

  const filteredWorkspaces = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("fr");
    if (!normalizedSearch) {
      return workspacesQuery.data ?? [];
    }

    return (workspacesQuery.data ?? []).filter(
      (workspace) =>
        workspace.name.toLocaleLowerCase("fr").includes(normalizedSearch) ||
        workspace.description
          ?.toLocaleLowerCase("fr")
          .includes(normalizedSearch),
    );
  }, [search, workspacesQuery.data]);

  const columns = useMemo(
    () =>
      getWorkspaceColumns({
        onDelete: (workspace) => {
          deleteWorkspace.reset();
          setSelectedWorkspace(workspace);
          setDeleteOpen(true);
        },
        onEdit: (workspace) => {
          updateWorkspace.reset();
          setSelectedWorkspace(workspace);
          setFormOpen(true);
        },
      }),
    [deleteWorkspace, updateWorkspace],
  );

  const handleSubmit = async (data: WorkspaceInput) => {
    try {
      if (selectedWorkspace) {
        await updateWorkspace.mutateAsync({
          data,
          workspaceId: selectedWorkspace.id,
        });
      } else {
        await createWorkspace.mutateAsync(data);
      }
      setFormOpen(false);
    } catch {
      // L'erreur de mutation reste affichée dans la boîte de dialogue.
    }
  };

  const handleDelete = async () => {
    if (!selectedWorkspace) {
      return;
    }

    try {
      await deleteWorkspace.mutateAsync(selectedWorkspace.id);
      setDeleteOpen(false);
      setSelectedWorkspace(null);
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
              createWorkspace.reset();
              setSelectedWorkspace(null);
              setFormOpen(true);
            }}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            Nouveau workspace
          </Button>
        }
        description="Organisez vos projets au sein de vos espaces de travail."
        title="Workspaces"
      />

      <div className="relative max-w-md">
        <Search
          aria-hidden="true"
          className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <Input
          aria-label="Rechercher un workspace"
          className="pl-9"
          onChange={(event) => {
            setSearch(event.target.value);
            setPagination((current) => ({ ...current, pageIndex: 0 }));
          }}
          placeholder="Rechercher un workspace…"
          value={search}
        />
      </div>

      {workspacesQuery.isError ? (
        <ErrorState
          error={workspacesQuery.error}
          onRetry={() => void workspacesQuery.refetch()}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredWorkspaces}
          emptyDescription="Créez votre premier workspace pour commencer."
          emptyTitle={search ? "Aucun résultat" : "Aucun workspace"}
          isLoading={workspacesQuery.isPending}
          manualPagination={false}
          manualSorting={false}
          onPaginationChange={setPagination}
          onSortingChange={setSorting}
          pageCount={Math.ceil(filteredWorkspaces.length / pagination.pageSize)}
          pagination={pagination}
          sorting={sorting}
          total={filteredWorkspaces.length}
        />
      )}

      <WorkspaceFormDialog
        error={
          selectedWorkspace ? updateWorkspace.error : createWorkspace.error
        }
        isPending={
          selectedWorkspace
            ? updateWorkspace.isPending
            : createWorkspace.isPending
        }
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        open={formOpen}
        workspace={selectedWorkspace}
      />

      <DeleteDialog
        description={`Le workspace « ${selectedWorkspace?.name ?? ""} » et ses ressources deviendront inaccessibles.`}
        error={deleteWorkspace.error}
        isPending={deleteWorkspace.isPending}
        onConfirm={handleDelete}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        title="Supprimer le workspace ?"
      />
    </div>
  );
}
