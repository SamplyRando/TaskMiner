import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { TaskKanbanCard } from "@/features/tasks/kanban/task-kanban-card";
import {
  taskStatusClasses,
  taskStatusLabels,
} from "@/features/tasks/task-presentation";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/project";
import type { Task, TaskStatus } from "@/types/task";

type TaskKanbanColumnProps = {
  canDrag: boolean;
  currentUserId: string;
  projectsById: Map<string, Project>;
  status: TaskStatus;
  tasks: Task[];
};

export function TaskKanbanColumn({
  canDrag,
  currentUserId,
  projectsById,
  status,
  tasks,
}: TaskKanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    data: { status, type: "column" },
    id: `kanban-column-${status}`,
  });

  return (
    <section
      ref={setNodeRef}
      aria-label={`${taskStatusLabels[status]}, ${String(tasks.length)} tâche${tasks.length > 1 ? "s" : ""}`}
      className={cn(
        "bg-muted/45 flex min-h-[32rem] w-full min-w-0 flex-col rounded-2xl border p-3 transition-colors sm:w-80 sm:min-w-80",
        isOver && "border-primary/50 bg-primary/5",
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn("size-2.5 rounded-full", {
              "bg-amber-500": status === "in_progress",
              "bg-emerald-500": status === "done",
              "bg-violet-500": status === "todo",
            })}
          />
          <h2 className="text-sm font-semibold">{taskStatusLabels[status]}</h2>
        </div>
        <Badge className={taskStatusClasses[status]} variant="outline">
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
