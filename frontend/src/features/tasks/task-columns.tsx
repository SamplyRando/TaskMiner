import type { ColumnDef } from "@tanstack/react-table";
import {
  MessageSquareText,
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
import { formatDateTime } from "@/lib/format";
import type { Project } from "@/types/project";
import type { Task, TaskUpdate } from "@/types/task";

type TaskColumnActions = {
  canManage: boolean;
  onAssign: (task: Task) => void;
  onAttachments: (task: Task) => void;
  onComments: (task: Task) => void;
  onDelete: (task: Task) => void;
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
  onEdit,
  onInlineUpdate,
  projects,
}: TaskColumnActions): ColumnDef<Task>[] {
  const projectNames = new Map(
    projects.map((project) => [project.id, project.name]),
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
      cell: ({ row }) =>
        projectNames.get(row.original.project_id) ?? "Projet inconnu",
    },
    {
      accessorKey: "status",
      enableSorting: false,
      header: "Statut",
      cell: ({ row }) => (
        <InlineTaskStatus
          canManage={canManage}
          onUpdate={onInlineUpdate}
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
      cell: ({ row }) => formatDateTime(row.original.due_date),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Créée le" />
      ),
      cell: ({ row }) => formatDateTime(row.original.created_at),
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            aria-label={`Commentaires de ${row.original.title}`}
            onClick={() => {
              onComments(row.original);
            }}
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
                size="icon"
                type="button"
                variant="ghost"
              >
                <UserRoundCog aria-hidden="true" className="size-4" />
              </Button>
              <Button
                aria-label={`Modifier ${row.original.title}`}
                onClick={() => {
                  onEdit(row.original);
                }}
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
                size="icon"
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
      ),
    },
  ];
}
