import type { ColumnDef } from "@tanstack/react-table";
import {
  MessageSquareText,
  Copy,
  Paperclip,
  Pencil,
  Trash2,
  UserRoundCog,
} from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import {
  InlineTaskPriority,
  InlineTaskStatus,
  InlineTaskTitle,
} from "@/features/tasks/task-inline-fields";
import { isTaskOverdue } from "@/features/tasks/task-presentation";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getProjectStatuses, type Project } from "@/types/project";
import type { Task, TaskUpdate } from "@/types/task";

type TaskColumnActions = {
  canManage: boolean;
  onAssign: (task: Task) => void;
  onAttachments: (task: Task) => void;
  onComments: (task: Task) => void;
  onDelete: (task: Task) => void;
  onDuplicate?: (task: Task) => void;
  onEdit: (task: Task) => void;
  onInlineUpdate: (task: Task, data: TaskUpdate) => Promise<void>;
  projects: Project[];
};

export function getTaskColumns({
  canManage,
  onAssign,
  onAttachments,
  onComments,
  onDelete,
  onDuplicate,
  onEdit,
  onInlineUpdate,
  projects,
}: TaskColumnActions): ColumnDef<Task>[] {
  const projectNames = new Map(
    projects.map((project) => [project.id, project.name]),
  );
  const projectStatuses = new Map(
    projects.map((project) => [project.id, getProjectStatuses(project)]),
  );

  return [
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Titre" />
      ),
      cell: ({ row }) => (
        <InlineTaskTitle
          canManage={canManage}
          onUpdate={onInlineUpdate}
          task={row.original}
        />
      ),
    },
    {
      accessorKey: "project_id",
      enableSorting: false,
      header: "Projet",
      cell: ({ row }) => {
        const name =
          projectNames.get(row.original.project_id) ?? "Projet inconnu";
        return (
          <span
            className="text-muted-foreground block max-w-44 truncate"
            title={name}
          >
            {name}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      enableSorting: false,
      header: "Statut",
      cell: ({ row }) => (
        <InlineTaskStatus
          canManage={canManage}
          onUpdate={onInlineUpdate}
          statuses={projectStatuses.get(row.original.project_id) ?? []}
          task={row.original}
        />
      ),
    },
    {
      accessorKey: "priority",
      enableSorting: false,
      header: "Priorité",
      cell: ({ row }) => (
        <InlineTaskPriority
          canManage={canManage}
          onUpdate={onInlineUpdate}
          task={row.original}
        />
      ),
    },
    {
      accessorKey: "due_date",
      enableSorting: false,
      header: "Échéance",
      cell: ({ row }) => (
        <span
          className={cn(
            "whitespace-nowrap tabular-nums",
            isTaskOverdue(row.original)
              ? "text-destructive font-medium"
              : "text-muted-foreground",
          )}
        >
          {formatDateTime(row.original.due_date)}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Créée le" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground whitespace-nowrap tabular-nums">
          {formatDateTime(row.original.created_at)}
        </span>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="text-muted-foreground flex justify-end gap-0.5">
          <Button
            aria-label={`Commentaires de ${row.original.title}`}
            onClick={() => {
              onComments(row.original);
            }}
            className="text-muted-foreground hover:text-foreground size-8"
            size="icon"
            title="Commentaires"
            type="button"
            variant="ghost"
          >
            <MessageSquareText aria-hidden="true" className="size-4" />
          </Button>
          <Button
            aria-label={`Pièces jointes de ${row.original.title}`}
            onClick={() => {
              onAttachments(row.original);
            }}
            className="text-muted-foreground hover:text-foreground size-8"
            size="icon"
            title="Pièces jointes"
            type="button"
            variant="ghost"
          >
            <Paperclip aria-hidden="true" className="size-4" />
          </Button>
          {canManage ? (
            <>
              <Button
                aria-label={`Assigner ${row.original.title}`}
                onClick={() => {
                  onAssign(row.original);
                }}
                className="text-muted-foreground hover:text-foreground size-8"
                size="icon"
                type="button"
                variant="ghost"
              >
                <UserRoundCog aria-hidden="true" className="size-4" />
              </Button>
              {onDuplicate ? (
                <Button
                  aria-label={`Dupliquer ${row.original.title}`}
                  onClick={() => {
                    onDuplicate(row.original);
                  }}
                  className="text-muted-foreground hover:text-foreground size-8"
                  size="icon"
                  title="Dupliquer"
                  type="button"
                  variant="ghost"
                >
                  <Copy aria-hidden="true" className="size-4" />
                </Button>
              ) : null}
              <Button
                aria-label={`Modifier ${row.original.title}`}
                onClick={() => {
                  onEdit(row.original);
                }}
                className="text-muted-foreground hover:text-foreground size-8"
                size="icon"
                type="button"
                variant="ghost"
              >
                <Pencil aria-hidden="true" className="size-4" />
              </Button>
              <Button
                aria-label={`Supprimer ${row.original.title}`}
                onClick={() => {
                  onDelete(row.original);
                }}
                className="text-muted-foreground hover:text-destructive size-8"
                size="icon"
                type="button"
                variant="ghost"
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
  ];
}
