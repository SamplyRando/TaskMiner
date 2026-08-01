import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { TaskKanbanCard } from "@/features/tasks/kanban/task-kanban-card";
import { TaskKanbanColumn } from "@/features/tasks/kanban/task-kanban-column";
import {
  performTaskMove,
  resolveTaskMove,
  type TaskMoveNotice,
} from "@/features/tasks/kanban/task-kanban-move";
import { TaskKanbanSkeleton } from "@/features/tasks/kanban/task-kanban-skeleton";
import { taskStatusLabels } from "@/features/tasks/task-presentation";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/project";
import { TASK_STATUSES, type Task, type TaskStatus } from "@/types/task";

type TaskKanbanProps = {
  canManageTasks: boolean;
  currentUserId: string;
  isLoading: boolean;
  onStatusChange: (task: Task, status: TaskStatus) => Promise<void>;
  projects: Project[];
  statusFilter: TaskStatus | "";
  tasks: Task[];
};

export function TaskKanban({
  canManageTasks,
  currentUserId,
  isLoading,
  onStatusChange,
  projects,
  statusFilter,
  tasks,
}: TaskKanbanProps) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const availableStatuses = useMemo(
    () =>
      statusFilter
        ? TASK_STATUSES.filter((status) => status === statusFilter)
        : [...TASK_STATUSES],
    [statusFilter],
  );
  const [mobileStatus, setMobileStatus] = useState<TaskStatus>(
    availableStatuses[0] ?? TASK_STATUSES[0],
  );
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [notice, setNotice] = useState<TaskMoveNotice | null>(null);
  const projectsById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );
  const tasksByStatus = useMemo(
    () =>
      new Map(
        TASK_STATUSES.map((status) => [
          status,
          tasks.filter((task) => task.status === status),
        ]),
      ),
    [tasks],
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (!notice) {
      return undefined;
    }
    const timeout = window.setTimeout(() => {
      setNotice(null);
    }, 4_000);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [notice]);

  if (isLoading) {
    return <TaskKanbanSkeleton />;
  }

  if (tasks.length === 0) {
    return (
      <div className="bg-card rounded-2xl border py-12">
        <EmptyState
          description="Créez une tâche ou ajustez les filtres actifs."
          title="Aucune tâche à afficher"
        />
      </div>
    );
  }

  const resolvedMobileStatus = availableStatuses.includes(mobileStatus)
    ? mobileStatus
    : (availableStatuses[0] ?? TASK_STATUSES[0]);
  const visibleStatuses = isMobile ? [resolvedMobileStatus] : availableStatuses;
  const mobileIndex = availableStatuses.indexOf(resolvedMobileStatus);

  const handleDragStart = ({ active }: DragStartEvent) => {
    setNotice(null);
    setActiveTask(tasks.find((task) => task.id === active.id) ?? null);
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    const overData: unknown = over?.data.current;
    setActiveTask(null);
    const move = resolveTaskMove(
      tasks,
      String(active.id),
      overData,
      canManageTasks,
    );
    if (!move) {
      return;
    }
    setNotice(await performTaskMove(move, onStatusChange));
  };

  return (
    <>
      {isMobile && availableStatuses.length > 1 ? (
        <nav
          aria-label="Navigation entre les colonnes Kanban"
          className="mb-3 flex items-center justify-between rounded-xl border p-2"
        >
          <button
            aria-label="Colonne précédente"
            className="hover:bg-muted rounded-md p-2 disabled:opacity-40"
            disabled={mobileIndex <= 0}
            onClick={() => {
              const previous = availableStatuses[mobileIndex - 1];
              if (previous) setMobileStatus(previous);
            }}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <p className="text-sm font-medium">
            {taskStatusLabels[resolvedMobileStatus]} · {mobileIndex + 1}/
            {availableStatuses.length}
          </p>
          <button
            aria-label="Colonne suivante"
            className="hover:bg-muted rounded-md p-2 disabled:opacity-40"
            disabled={mobileIndex >= availableStatuses.length - 1}
            onClick={() => {
              const next = availableStatuses[mobileIndex + 1];
              if (next) setMobileStatus(next);
            }}
            type="button"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </nav>
      ) : null}

      <DndContext
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "Pour déplacer une tâche, appuyez sur Espace, utilisez les flèches, puis appuyez à nouveau sur Espace.",
          },
        }}
        autoScroll
        collisionDetection={closestCorners}
        onDragCancel={() => {
          setActiveTask(null);
        }}
        onDragEnd={(event) => {
          void handleDragEnd(event);
        }}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        <div
          aria-label="Tableau Kanban des tâches"
          className={cn(
            "flex gap-4 pb-3",
            isMobile ? "w-full" : "overflow-x-auto overscroll-x-contain",
          )}
        >
          {visibleStatuses.map((status) => (
            <TaskKanbanColumn
              canDrag={canManageTasks}
              currentUserId={currentUserId}
              key={status}
              projectsById={projectsById}
              status={status}
              tasks={tasksByStatus.get(status) ?? []}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 220, easing: "ease" }}>
          {activeTask ? (
            <TaskKanbanCard
              canDrag
              currentUserId={currentUserId}
              isOverlay
              project={projectsById.get(activeTask.project_id)}
              task={activeTask}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {notice ? (
        <div
          className={cn(
            "fixed right-4 bottom-4 z-50 max-w-sm rounded-xl border px-4 py-3 text-sm shadow-lg",
            notice.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800",
          )}
          role={notice.kind === "error" ? "alert" : "status"}
        >
          {notice.message}
        </div>
      ) : null}
    </>
  );
}
