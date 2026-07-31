import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import type { Project } from "@/types/project";

type ProjectColumnActions = {
  onDelete: (project: Project) => void;
  onEdit: (project: Project) => void;
};

export function getProjectColumns({
  onDelete,
  onEdit,
}: ProjectColumnActions): ColumnDef<Project>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nom" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "description",
      enableSorting: false,
      header: "Description",
      cell: ({ row }) => (
        <span className="text-muted-foreground line-clamp-2 max-w-md">
          {row.original.description ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Créé le" />
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
            aria-label={`Modifier ${row.original.name}`}
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
            aria-label={`Supprimer ${row.original.name}`}
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
