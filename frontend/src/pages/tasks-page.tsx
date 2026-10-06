import type { PaginationState, SortingState } from "@tanstack/react-table";
import { Columns3, List, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DataTable } from "@/components/data-table/data-table";
import { DeleteDialog } from "@/components/delete-dialog";
import { EntityPageHeader } from "@/components/entity-page-header";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { WorkspaceSelector } from "@/components/workspace-selector";
import { TaskAttachmentsDialog } from "@/features/attachments/task-attachments-dialog";
import { TaskCommentsDialog } from "@/features/comments/task-comments-dialog";
import { useProjects } from "@/features/projects/hooks";
import { useUserPreferences } from "@/features/settings/hooks";
import {
  useAssignTask,
  useCreateTask,
  useDeleteTask,
  useDuplicateTask,
  useKanbanTasks,
  useTasks,
  useUpdateTask,
} from "@/features/tasks/hooks";
import { TaskKanban } from "@/features/tasks/kanban/task-kanban";
import { TaskAssignmentDialog } from "@/features/tasks/task-assignment-dialog";
import { getTaskColumns } from "@/features/tasks/task-columns";
import { TaskFormDialog } from "@/features/tasks/task-form-dialog";
import { useAssignableWorkspaceMembers } from "@/features/workspaces/hooks";
import { useWorkspacePermissions } from "@/features/workspaces/permissions-hooks";
import { useActiveWorkspace } from "@/hooks/use-active-workspace";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSessionState } from "@/hooks/use-session-state";
import { useAuthStore } from "@/store/auth-store";
import { useTaskViewStore } from "@/store/task-view-store";
import type {
  Task,
  TaskInput,
  TaskPriority,
  TaskSort,
  TaskStatus,
  TaskUpdate,
} from "@/types/task";
import { getProjectStatuses } from "@/types/project";

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
  const [search, setSearch] = useSessionState("taskminer-tasks-search", "");
  const deferredSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = useSessionState<TaskStatus>(
    "taskminer-tasks-status",
    "",
  );
  const [priority, setPriority] = useSessionState<TaskPriority | "">(
    "taskminer-tasks-priority",
    "",
  );
  const [projectId, setProjectId] = useSessionState(
    "taskminer-tasks-project",
    "",
  );
  const [pagination, setPagination] = useSessionState(
    "taskminer-tasks-pagination",
    initialPagination,
  );
  const [sorting, setSorting] = useSessionState<SortingState>(
    "taskminer-tasks-sorting",
    initialSorting,
  );
  const [formOpen, setFormOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
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
  }, [preferences.data, setPagination]);

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
  const canManageTasks =
    permissionsQuery.data?.permissions.manage_tasks ?? false;
  const assignableMembersQuery = useAssignableWorkspaceMembers(
    workspace.activeWorkspaceId,
    (assignmentOpen || commentsOpen) && canManageTasks,
  );
  const projects = useMemo(
    () => projectsQuery.data?.items ?? [],
    [projectsQuery.data?.items],
  );
  const selectedProject = projects.find((project) => project.id === projectId);
  const selectedStatuses = selectedProject
    ? getProjectStatuses(selectedProject)
    : [];
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
    mode === "kanban" &&
      workspace.activeWorkspaceId !== null &&
      Boolean(projectId),
  );
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const duplicateTask = useDuplicateTask();
  const assignTask = useAssignTask();

  const columns = useMemo(
    () =>
      getTaskColumns({
        canManage: canManageTasks,
        onAssign: (task) => {
          assignTask.reset();
          setSelectedTask(task);
          setAssignmentOpen(true);
        },
        onAttachments: (task) => {
          setSelectedTask(task);
          setAttachmentsOpen(true);
        },
        onComments: (task) => {
          setSelectedTask(task);
          setCommentsOpen(true);
        },
        onDelete: (task) => {
          deleteTask.reset();
          setSelectedTask(task);
          setDeleteOpen(true);
        },
        onDuplicate: (task) => {
          duplicateTask.mutate(task.id);
        },
        onEdit: (task) => {
          updateTask.reset();
          setSelectedTask(task);
          setFormOpen(true);
        },
        onInlineUpdate: async (task: Task, data: TaskUpdate) => {
          await updateTask.mutateAsync({ data, taskId: task.id });
        },
        projects,
      }),
    [
      assignTask,
      canManageTasks,
      deleteTask,
      duplicateTask,
      projects,
      updateTask,
    ],
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
              disabled={!canManageTasks || projects.length === 0}
              onClick={() => {
                createTask.reset();
                setSelectedTask(null);
                setFormOpen(true);
              }}
              title={
                !canManageTasks
                  ? "Vous n’avez pas la permission de gérer les tâches"
                  : projects.length === 0
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

      <div className="bg-card rounded-card grid gap-2.5 border p-2.5 shadow-xs sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(10rem,0.5fr)_minmax(12rem,0.8fr)_repeat(3,minmax(10rem,0.55fr))]">
        <WorkspaceSelector
          compact
          disabled={workspace.isPending}
          onValueChange={(workspaceId) => {
            workspace.selectWorkspace(workspaceId);
            setProjectId("");
            setStatus("");
            resetPage();
          }}
          value={workspace.activeWorkspaceId}
          workspaces={workspace.workspaces}
        />
        <div className="relative lg:col-span-2 xl:col-span-1">
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
            setStatus("");
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
          disabled={!projectId}
          onChange={(event) => {
            setStatus(event.target.value);
            resetPage();
          }}
          value={status}
        >
          <option value="">Tous les statuts</option>
          {selectedStatuses.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filtrer par priorité"
          className="sm:col-span-2 lg:col-span-1"
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
      ) : mode === "kanban" && !projectId ? (
        <div className="bg-card rounded-card border py-12">
          <EmptyState
            description="Sélectionnez un projet pour afficher son workflow personnalisé."
            title="Choisissez un projet pour le Kanban"
          />
        </div>
      ) : mode === "kanban" ? (
        <TaskKanban
          canManageTasks={canManageTasks}
          currentUserId={currentUserId}
          emptyAction={
            projects.length > 0 && canManageTasks ? (
              <Button
                onClick={() => {
                  createTask.reset();
                  setSelectedTask(null);
                  setFormOpen(true);
                }}
                type="button"
              >
                <Plus aria-hidden="true" className="size-4" />
                Créer une tâche
              </Button>
            ) : undefined
          }
          isLoading={
            workspace.isPending ||
            projectsQuery.isPending ||
            kanbanQuery.isPending ||
            permissionsQuery.isPending
          }
          onAssign={(task) => {
            assignTask.reset();
            setSelectedTask(task);
            setAssignmentOpen(true);
          }}
          onDelete={(task) => {
            deleteTask.reset();
            setSelectedTask(task);
            setDeleteOpen(true);
          }}
          onDuplicate={(task) => {
            duplicateTask.mutate(task.id);
          }}
          onEdit={(task) => {
            updateTask.reset();
            setSelectedTask(task);
            setFormOpen(true);
          }}
          onOpenAttachments={(task) => {
            setSelectedTask(task);
            setAttachmentsOpen(true);
          }}
          onOpenComments={(task) => {
            setSelectedTask(task);
            setCommentsOpen(true);
          }}
          onStatusChange={async (task, nextStatus) => {
            await updateTask.mutateAsync({
              data: { status: nextStatus },
              taskId: task.id,
            });
          }}
          projects={projects}
          statusFilter={status}
          statuses={selectedStatuses}
          tasks={kanbanQuery.data?.items ?? []}
        />
      ) : (
        <DataTable
          columns={columns}
          data={tasksQuery.data?.items ?? []}
          emptyAction={
            search ||
            status ||
            priority ||
            projectId ||
            projects.length === 0 ||
            !canManageTasks ? undefined : (
              <Button
                onClick={() => {
                  createTask.reset();
                  setSelectedTask(null);
                  setFormOpen(true);
                }}
                type="button"
              >
                <Plus aria-hidden="true" className="size-4" />
                Créer une tâche
              </Button>
            )
          }
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
          mobileLabels={{
            assigned_user: "Assignée à",
            created_at: "Créée le",
            due_date: "Échéance",
            priority: "Priorité",
            project_id: "Projet",
            status: "Statut",
            title: "Tâche",
          }}
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

      <TaskAttachmentsDialog
        canManage={canManageTasks}
        onOpenChange={setAttachmentsOpen}
        open={attachmentsOpen}
        task={selectedTask}
      />

      <TaskCommentsDialog
        canManage={canManageTasks}
        currentUserId={currentUserId}
        members={assignableMembersQuery.data?.items ?? []}
        membersError={assignableMembersQuery.error}
        membersLoading={assignableMembersQuery.isPending}
        onOpenChange={setCommentsOpen}
        open={commentsOpen}
        task={selectedTask}
      />

      <TaskAssignmentDialog
        currentUserId={currentUserId}
        error={assignTask.error}
        isMembersLoading={assignableMembersQuery.isPending}
        isPending={assignTask.isPending}
        members={assignableMembersQuery.data?.items ?? []}
        membersError={assignableMembersQuery.error}
        onOpenChange={setAssignmentOpen}
        onRetryMembers={() => {
          void assignableMembersQuery.refetch();
        }}
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
