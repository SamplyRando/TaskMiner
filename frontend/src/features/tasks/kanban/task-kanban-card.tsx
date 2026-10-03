import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDays,
  GripVertical,
  MessageSquareText,
  Paperclip,
  Pencil,
  Trash2,
  UserRound,
  UserRoundCog,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  taskPriorityClasses,
  taskPriorityLabels,
} from "@/features/tasks/task-presentation";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/project";
import type { Task } from "@/types/task";

type TaskKanbanCardProps = {
  canDrag: boolean;
  currentUserId: string;
  isOverlay?: boolean;
  onAssign: (task: Task) => void;
  onDelete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onOpenAttachments: (task: Task) => void;
  onOpenComments: (task: Task) => void;
  project: Project | undefined;
  task: Task;
};

const formatDueDate = (value: string | null): string => {
  if (!value) {
    return "Sans échéance";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const getAssigneeLabel = (task: Task, currentUserId: string): string | null => {
  if (!task.assigned_user_id) {
    return null;
  }
  if (task.assigned_user_id === currentUserId) {
    return "Assignée à vous";
  }
  return "Assignée à un membre";
};

export function TaskKanbanCard({
  canDrag,
  currentUserId,
  isOverlay = false,
  onAssign,
  onDelete,
  onEdit,
  onOpenAttachments,
  onOpenComments,
  project,
  task,
}: TaskKanbanCardProps) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    data: { status: task.status, task, type: "task" },
    disabled: !canDrag || isOverlay,
    id: isOverlay ? `${task.id}-overlay` : task.id,
  });
  const assigneeLabel = getAssigneeLabel(task, currentUserId);
  const unavailableMessage =
    "Vous ne disposez pas de la permission de modifier cette tâche.";

  return (
    <article
      ref={setNodeRef}
      aria-describedby={!canDrag ? `task-permission-${task.id}` : undefined}
      className={cn(
        "bg-card border-border group rounded-xl border p-3.5 shadow-sm transition-[box-shadow,opacity,transform]",
        canDrag ? "hover:shadow-md" : "opacity-75",
        isDragging && "opacity-30",
        isOverlay && "w-80 rotate-2 shadow-xl",
      )}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      title={!canDrag ? unavailableMessage : undefined}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm leading-5 font-semibold">
            {task.title}
          </h3>
          <p className="text-muted-foreground mt-1 truncate text-xs">
            {project?.name ?? "Projet indisponible"}
          </p>
        </div>
        {isOverlay ? (
          <GripVertical
            aria-hidden="true"
            className="text-muted-foreground size-4 shrink-0"
          />
        ) : (
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-describedby={
              !canDrag ? `task-permission-${task.id}` : undefined
            }
            aria-label={`Déplacer ${task.title}`}
            className={cn(
              "text-muted-foreground shrink-0 rounded-sm p-1 focus-visible:ring-2 focus-visible:outline-none",
              canDrag
                ? "cursor-grab touch-none opacity-50 group-hover:opacity-100 active:cursor-grabbing"
                : "cursor-not-allowed opacity-30",
            )}
            disabled={!canDrag}
            type="button"
          >
            <GripVertical aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge className={taskPriorityClasses[task.priority]} variant="outline">
          {taskPriorityLabels[task.priority]}
        </Badge>
      </div>

      <div className="text-muted-foreground mt-3 space-y-1.5 text-xs">
        <div className="flex items-center gap-1.5">
          <CalendarDays aria-hidden="true" className="size-3.5" />
          <span>{formatDueDate(task.due_date)}</span>
        </div>
        {assigneeLabel ? (
          <div className="flex items-center gap-1.5">
            <UserRound aria-hidden="true" className="size-3.5" />
            <span className="truncate">{assigneeLabel}</span>
          </div>
        ) : null}
      </div>

      {!isOverlay ? (
        <div
          className="mt-3 flex flex-wrap justify-end gap-1 border-t pt-2"
          onClick={(event) => {
            event.stopPropagation();
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
        >
          <Button
            aria-label={`Commentaires de ${task.title}`}
            onClick={() => {
              onOpenComments(task);
            }}
            size="icon"
            title="Commentaires"
            type="button"
            variant="ghost"
          >
            <MessageSquareText aria-hidden="true" className="size-4" />
          </Button>
          <Button
            aria-label={`Pièces jointes de ${task.title}`}
            onClick={() => {
              onOpenAttachments(task);
            }}
            size="icon"
            title="Pièces jointes"
            type="button"
            variant="ghost"
          >
            <Paperclip aria-hidden="true" className="size-4" />
          </Button>
          {canDrag ? (
            <>
              <Button
                aria-label={`Assigner ${task.title}`}
                onClick={() => {
                  onAssign(task);
                }}
                size="icon"
                title="Assigner"
                type="button"
                variant="ghost"
              >
                <UserRoundCog aria-hidden="true" className="size-4" />
              </Button>
              <Button
                aria-label={`Modifier ${task.title}`}
                onClick={() => {
                  onEdit(task);
                }}
                size="icon"
                title="Modifier"
                type="button"
                variant="ghost"
              >
                <Pencil aria-hidden="true" className="size-4" />
              </Button>
              <Button
                aria-label={`Supprimer ${task.title}`}
                onClick={() => {
                  onDelete(task);
                }}
                size="icon"
                title="Supprimer"
                type="button"
                variant="ghost"
              >
                <Trash2
                  aria-hidden="true"
                  className="text-destructive size-4"
                />
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      {!canDrag ? (
        <p
          className="text-destructive mt-2 text-xs"
          id={`task-permission-${task.id}`}
        >
          {unavailableMessage}
        </p>
      ) : null}
    </article>
  );
}
