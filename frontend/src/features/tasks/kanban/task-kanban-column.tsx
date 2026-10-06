import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { EmptyState } from "@/components/empty-state";
import { TaskKanbanCard } from "@/features/tasks/kanban/task-kanban-card";
import { getTaskStatusTone } from "@/features/tasks/task-presentation";
import { toneDotClasses } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { Project, ProjectTaskStatus } from "@/types/project";
import type { Task } from "@/types/task";

type TaskKanbanColumnProps = {
  canDrag: boolean;
  currentUserId: string;
  onAssign: (task: Task) => void;
  onDelete: (task: Task) => void;
  onDuplicate?: (task: Task) => void;
  onEdit: (task: Task) => void;
  onOpenAttachments: (task: Task) => void;
  onOpenComments: (task: Task) => void;
  projectsById: Map<string, Project>;
  status: ProjectTaskStatus;
  tasks: Task[];
};

export function TaskKanbanColumn({
  canDrag,
  currentUserId,
  onAssign,
  onDelete,
  onDuplicate,
  onEdit,
  onOpenAttachments,
  onOpenComments,
  projectsById,
  status,
  tasks,
}: TaskKanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    data: { status: status.key, type: "column" },
    id: `kanban-column-${status.key}`,
  });

  return (
    <section
      ref={setNodeRef}
      aria-label={`${status.label}, ${String(tasks.length)} tâche${tasks.length > 1 ? "s" : ""}`}
      className={cn(
        "bg-surface-sunken rounded-card flex min-h-[32rem] w-full min-w-0 flex-col border p-2 transition-colors duration-150 sm:w-76 sm:min-w-76",
        isOver && "border-primary/40 bg-primary-subtle",
      )}
    >
      <header className="mb-2 flex items-center justify-between gap-2 px-1.5 pt-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              "size-2 shrink-0 rounded-full",
              toneDotClasses[
                getTaskStatusTone(status.key, status.is_completed)
              ],
            )}
          />
          <h2 className="truncate text-sm font-semibold">{status.label}</h2>
        </div>
        <span className="text-muted-foreground bg-surface rounded-sm border px-1.5 text-xs leading-5 font-medium tabular-nums">
          {tasks.length}
        </span>
      </header>

      <SortableContext
        items={tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex min-h-24 flex-1 flex-col gap-2">
          {tasks.length === 0 ? (
            <EmptyState
              description="Glissez une tâche ici pour changer son statut."
              title="Aucune tâche"
              variant="compact"
            />
          ) : (
            tasks.map((task) => (
              <TaskKanbanCard
                canDrag={canDrag}
                currentUserId={currentUserId}
                key={task.id}
                onAssign={onAssign}
                onDelete={onDelete}
                {...(onDuplicate ? { onDuplicate } : {})}
                onEdit={onEdit}
                onOpenAttachments={onOpenAttachments}
                onOpenComments={onOpenComments}
                project={projectsById.get(task.project_id)}
                task={task}
              />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}
