import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { TaskKanbanCard } from "@/features/tasks/kanban/task-kanban-card";
import { getTaskStatusClass } from "@/features/tasks/task-presentation";
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
        "bg-muted/45 flex min-h-[32rem] w-full min-w-0 flex-col rounded-2xl border p-3 transition-colors sm:w-80 sm:min-w-80",
        isOver && "border-primary/50 bg-primary/5",
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              "size-2.5 rounded-full",
              status.is_completed ? "bg-emerald-500" : "bg-violet-500",
            )}
          />
          <h2 className="text-sm font-semibold">{status.label}</h2>
        </div>
        <Badge
          className={getTaskStatusClass(status.key, status.is_completed)}
          variant="outline"
        >
          {tasks.length}
        </Badge>
      </header>

      <SortableContext
        items={tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex min-h-24 flex-1 flex-col gap-3">
          {tasks.length === 0 ? (
            <EmptyState
              description="Glissez une tâche ici pour changer son statut."
              title="Aucune tâche"
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
