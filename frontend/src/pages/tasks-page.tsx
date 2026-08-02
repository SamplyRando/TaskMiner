import type { PaginationState, SortingState } from "@tanstack/react-table";
import { Columns3, List, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DataTable } from "@/components/data-table/data-table";
import { DeleteDialog } from "@/components/delete-dialog";
import { EntityPageHeader } from "@/components/entity-page-header";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { WorkspaceSelector } from "@/components/workspace-selector";
import { useProjects } from "@/features/projects/hooks";
import { useUserPreferences } from "@/features/settings/hooks";
import {
  useAssignTask,
  useCreateTask,
  useDeleteTask,
  useKanbanTasks,
  useTasks,
  useUpdateTask,
} from "@/features/tasks/hooks";
import { TaskKanban } from "@/features/tasks/kanban/task-kanban";
import { TaskAssignmentDialog } from "@/features/tasks/task-assignment-dialog";
import { getTaskColumns } from "@/features/tasks/task-columns";
import { TaskFormDialog } from "@/features/tasks/task-form-dialog";
import { useWorkspacePermissions } from "@/features/workspaces/permissions-hooks";
import { useActiveWorkspace } from "@/hooks/use-active-workspace";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAuthStore } from "@/store/auth-store";
import { useTaskViewStore } from "@/store/task-view-store";
import type {
  Task,
  TaskInput,
  TaskPriority,
  TaskSort,
  TaskStatus,
} from "@/types/task";

const initialPagination: PaginationState = { pageIndex: 0, pageSize: 20 };
const initialSorting: SortingState = [{ desc: true, id: "created_at" }];

function getSortParameter(sorting: SortingState): TaskSort {
  const firstSort = sorting[0];
  const field =
    firstSort?.id === "title" ||
    firstSort?.id === "updated_at" ||
    firstSort?.id === "created_at"
      ? firstSort.id
      : "created_at";

  return `${firstSort?.desc === false ? "" : "-"}${field}` as TaskSort;
}

export function TasksPage() {
  const preferences = useUserPreferences();
  const pageSizeApplied = useRef(false);
  const currentUserId = useAuthStore((state) => state.currentUser?.id ?? "");
  const mode = useTaskViewStore((state) => state.mode);
  const setMode = useTaskViewStore((state) => state.setMode);
  const workspace = useActiveWorkspace();
  const [search, setSearch] = useState("");
  const deferredSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [projectId, setProjectId] = useState("");
  const [pagination, setPagination] = useState(initialPagination);
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [formOpen, setFormOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!preferences.data || pageSizeApplied.current) return;
    pageSizeApplied.current = true;
    setPagination((current) =>
      current.pageSize === preferences.data.items_per_page
        ? current
        : { pageIndex: 0, pageSize: preferences.data.items_per_page },
    );
  }, [preferences.data]);

  const projectsQuery = useProjects(
    {
      limit: 100,
      skip: 0,
      sort: "name",
      ...(workspace.activeWorkspaceId
        ? { workspace_id: workspace.activeWorkspaceId }
        : {}),
    },
    workspace.activeWorkspaceId !== null,
  );
  const permissionsQuery = useWorkspacePermissions(workspace.activeWorkspaceId);
  const projects = useMemo(
    () => projectsQuery.data?.items ?? [],
    [projectsQuery.data?.items],
  );
  const normalizedSearch = deferredSearch.trim();
  const taskFilters = {
    sort: getSortParameter(sorting),
    ...(normalizedSearch ? { search: normalizedSearch } : {}),
    ...(priority ? { priority } : {}),
    ...(projectId ? { project_id: projectId } : {}),
    ...(status ? { status } : {}),
    ...(workspace.activeWorkspaceId
      ? { workspace_id: workspace.activeWorkspaceId }
      : {}),
  } as const;
  const tasksQuery = useTasks(
    {
      ...taskFilters,
      limit: pagination.pageSize,
      skip: pagination.pageIndex * pagination.pageSize,
    },
    mode === "list" && workspace.activeWorkspaceId !== null,
  );
  const kanbanQuery = useKanbanTasks(
    taskFilters,
    mode === "kanban" && workspace.activeWorkspaceId !== null,
  );
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const assignTask = useAssignTask();

  const columns = useMemo(
    () =>
      getTaskColumns({
        onAssign: (task) => {
          assignTask.reset();
          setSelectedTask(task);
          setAssignmentOpen(true);
        },
        onDelete: (task) => {
          deleteTask.reset();
          setSelectedTask(task);
          setDeleteOpen(true);
        },
        onEdit: (task) => {
          updateTask.reset();
          setSelectedTask(task);
          setFormOpen(true);
        },
        projects,
      }),
    [assignTask, deleteTask, projects, updateTask],
  );

  const resetPage = () => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  };

  const handleSubmit = async (_projectId: string, data: TaskInput) => {
    try {
      if (selectedTask) {
        await updateTask.mutateAsync({ data, taskId: selectedTask.id });
      } else {
        await createTask.mutateAsync({ data, projectId: _projectId });
      }
      setFormOpen(false);
    } catch {
      // L'erreur de mutation reste affichée dans la boîte de dialogue.
    }
  };

  const handleAssignment = async (assignedUserId: string | null) => {
    if (!selectedTask) {
      return;
    }

    try {
      await assignTask.mutateAsync({
        assignedUserId,
        taskId: selectedTask.id,
      });
      setAssignmentOpen(false);
    } catch {
      // L'erreur de mutation reste affichée dans la boîte de dialogue.
    }
  };

  const handleDelete = async () => {
    if (!selectedTask) {
      return;
    }

    try {
      await deleteTask.mutateAsync(selectedTask.id);
      setDeleteOpen(false);
      setSelectedTask(null);
    } catch {
      // L'erreur de mutation reste affichée dans la boîte de dialogue.
    }
  };

  return (
    <div className="space-y-6">
      <EntityPageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div
              aria-label="Mode d’affichage des tâches"
              className="bg-muted flex rounded-lg p-1"
              role="group"
            >
              <Button
                aria-pressed={mode === "list"}
                className="h-8 px-3"
                onClick={() => {
                  setMode("list");
                }}
                type="button"
                variant={mode === "list" ? "default" : "ghost"}
              >
                <List aria-hidden="true" className="size-4" />
                Liste
              </Button>
              <Button
                aria-pressed={mode === "kanban"}
                className="h-8 px-3"
                onClick={() => {
                  setMode("kanban");
                }}
                type="button"
                variant={mode === "kanban" ? "default" : "ghost"}
              >
                <Columns3 aria-hidden="true" className="size-4" />
                Kanban
              </Button>
            </div>
            <Button
              disabled={projects.length === 0}
              onClick={() => {
                createTask.reset();
                setSelectedTask(null);
                setFormOpen(true);
              }}
              title={
                projects.length === 0
                  ? "Créez d’abord un projet"
                  : "Créer une tâche"
              }
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
              Nouvelle tâche
            </Button>
          </div>
        }
        description="Planifiez, filtrez et assignez les tâches de vos projets."
        title="Tâches"
      />

      <WorkspaceSelector
        disabled={workspace.isPending}
        onValueChange={(workspaceId) => {
          workspace.selectWorkspace(workspaceId);
          setProjectId("");
          resetPage();
        }}
        value={workspace.activeWorkspaceId}
        workspaces={workspace.workspaces}
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_repeat(3,minmax(10rem,0.35fr))]">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            aria-label="Rechercher une tâche"
            className="pl-9"
            onChange={(event) => {
              setSearch(event.target.value);
              resetPage();
            }}
            placeholder="Rechercher une tâche…"
            value={search}
          />
        </div>
        <Select
          aria-label="Filtrer par projet"
          onChange={(event) => {
            setProjectId(event.target.value);
            resetPage();
          }}
          value={projectId}
        >
          <option value="">Tous les projets</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filtrer par statut"
          onChange={(event) => {
            setStatus(event.target.value as TaskStatus | "");
            resetPage();
          }}
          value={status}
        >
          <option value="">Tous les statuts</option>
          <option value="todo">À faire</option>
          <option value="in_progress">En cours</option>
          <option value="done">Terminée</option>
        </Select>
        <Select
          aria-label="Filtrer par priorité"
          onChange={(event) => {
            setPriority(event.target.value as TaskPriority | "");
            resetPage();
          }}
          value={priority}
        >
          <option value="">Toutes les priorités</option>
          <option value="low">Basse</option>
          <option value="medium">Moyenne</option>
          <option value="high">Haute</option>
          <option value="urgent">Urgente</option>
        </Select>
      </div>

      {(mode === "list" && tasksQuery.isError) ||
      (mode === "kanban" && kanbanQuery.isError) ||
      projectsQuery.isError ||
      workspace.isError ||
      (mode === "kanban" && permissionsQuery.isError) ? (
        <ErrorState
          error={
            (mode === "list" ? tasksQuery.error : kanbanQuery.error) ??
            projectsQuery.error ??
            workspace.error ??
            permissionsQuery.error
          }
          onRetry={() => {
            if (mode === "list") {
              void tasksQuery.refetch();
            } else {
              void kanbanQuery.refetch();
              void permissionsQuery.refetch();
            }
            void projectsQuery.refetch();
            void workspace.refetch();
          }}
        />
      ) : mode === "kanban" ? (
        <TaskKanban
          canManageTasks={
            permissionsQuery.data?.permissions.manage_tasks ?? false
          }
          currentUserId={currentUserId}
          isLoading={
            workspace.isPending ||
            projectsQuery.isPending ||
            kanbanQuery.isPending ||
            permissionsQuery.isPending
          }
          onStatusChange={async (task, nextStatus) => {
            await updateTask.mutateAsync({
              data: { status: nextStatus },
              taskId: task.id,
            });
          }}
          projects={projects}
          statusFilter={status}
          tasks={kanbanQuery.data?.items ?? []}
        />
      ) : (
        <DataTable
          columns={columns}
          data={tasksQuery.data?.items ?? []}
          emptyDescription="Créez une tâche ou ajustez les filtres actifs."
          emptyTitle={
            search || status || priority || projectId
              ? "Aucun résultat"
              : "Aucune tâche"
          }
          isLoading={
            workspace.isPending ||
            tasksQuery.isPending ||
            projectsQuery.isPending
          }
          manualPagination
          manualSorting
          onPaginationChange={setPagination}
          onSortingChange={(updater) => {
            setSorting(updater);
            resetPage();
          }}
          pageCount={Math.ceil(
            (tasksQuery.data?.total ?? 0) / pagination.pageSize,
          )}
          pagination={pagination}
          sorting={sorting}
          total={tasksQuery.data?.total ?? 0}
        />
      )}

      <TaskFormDialog
        error={selectedTask ? updateTask.error : createTask.error}
        isPending={selectedTask ? updateTask.isPending : createTask.isPending}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        open={formOpen}
        projects={projects}
        task={selectedTask}
      />

      <TaskAssignmentDialog
        currentUserId={currentUserId}
        error={assignTask.error}
        isPending={assignTask.isPending}
        onOpenChange={setAssignmentOpen}
        onSubmit={handleAssignment}
        open={assignmentOpen}
        task={selectedTask}
      />

      <DeleteDialog
        description={`La tâche « ${selectedTask?.title ?? ""} » deviendra inaccessible.`}
        error={deleteTask.error}
        isPending={deleteTask.isPending}
        onConfirm={handleDelete}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        title="Supprimer la tâche ?"
      />
    </div>
  );
}
