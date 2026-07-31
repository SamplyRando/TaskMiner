import type { PaginationState, SortingState } from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable } from "@/components/data-table/data-table";
import { DeleteDialog } from "@/components/delete-dialog";
import { EntityPageHeader } from "@/components/entity-page-header";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useProjects } from "@/features/projects/hooks";
import {
  useAssignTask,
  useCreateTask,
  useDeleteTask,
  useTasks,
  useUpdateTask,
} from "@/features/tasks/hooks";
import { TaskAssignmentDialog } from "@/features/tasks/task-assignment-dialog";
import { getTaskColumns } from "@/features/tasks/task-columns";
import { TaskFormDialog } from "@/features/tasks/task-form-dialog";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAuthStore } from "@/store/auth-store";
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
  const currentUserId = useAuthStore((state) => state.currentUser?.id ?? "");
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

  const projectsQuery = useProjects({ limit: 100, skip: 0, sort: "name" });
  const projects = useMemo(
    () => projectsQuery.data?.items ?? [],
    [projectsQuery.data?.items],
  );
  const normalizedSearch = deferredSearch.trim();
  const tasksQuery = useTasks({
    limit: pagination.pageSize,
    skip: pagination.pageIndex * pagination.pageSize,
    sort: getSortParameter(sorting),
    ...(normalizedSearch ? { search: normalizedSearch } : {}),
    ...(priority ? { priority } : {}),
    ...(projectId ? { project_id: projectId } : {}),
    ...(status ? { status } : {}),
  });
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
        }
        description="Planifiez, filtrez et assignez les tâches de vos projets."
        title="Tâches"
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

      {tasksQuery.isError || projectsQuery.isError ? (
        <ErrorState
          error={tasksQuery.error ?? projectsQuery.error}
          onRetry={() => {
            void tasksQuery.refetch();
            void projectsQuery.refetch();
          }}
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
          isLoading={tasksQuery.isPending || projectsQuery.isPending}
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
