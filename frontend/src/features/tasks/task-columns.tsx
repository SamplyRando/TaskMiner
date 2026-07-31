import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, UserRoundCog } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import type { Project } from "@/types/project";
import type { Task, TaskPriority, TaskStatus } from "@/types/task";

const statusLabels: Record<TaskStatus, string> = {
  done: "Terminée",
  in_progress: "En cours",
  todo: "À faire",
};

const priorityLabels: Record<TaskPriority, string> = {
  high: "Haute",
  low: "Basse",
  medium: "Moyenne",
  urgent: "Urgente",
};

type TaskColumnActions = {
  onAssign: (task: Task) => void;
  onDelete: (task: Task) => void;
  onEdit: (task: Task) => void;
  projects: Project[];
};

export function getTaskColumns({
  onAssign,
  onDelete,
  onEdit,
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
        <div className="max-w-xs">
          <p className="font-medium">{row.original.title}</p>
          {row.original.description ? (
            <p className="text-muted-foreground line-clamp-1 text-sm">
              {row.original.description}
            </p>
          ) : null}
        </div>
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
        <Badge
          variant={row.original.status === "done" ? "default" : "secondary"}
        >
          {statusLabels[row.original.status]}
        </Badge>
      ),
    },
    {
      accessorKey: "priority",
      enableSorting: false,
      header: "Priorité",
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.priority === "urgent" ? "destructive" : "outline"
          }
        >
          {priorityLabels[row.original.priority]}
        </Badge>
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
            <Trash2 aria-hidden="true" className="text-destructive size-4" />
          </Button>
        </div>
      ),
    },
  ];
}
