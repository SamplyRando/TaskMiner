import type { ColumnDef } from "@tanstack/react-table";
import { Copy, Download, ListChecks, Pencil, Trash2 } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Project } from "@/types/project";

type ProjectColumnActions = {
  canManage: boolean;
  onDelete: (project: Project) => void;
  onDuplicate?: (project: Project) => void;
  onEdit: (project: Project) => void;
  onExport?: (project: Project) => void;
  onWorkflow?: (project: Project) => void;
};

export function getProjectColumns({
  canManage,
  onDelete,
  onDuplicate,
  onEdit,
  onExport,
  onWorkflow,
}: ProjectColumnActions): ColumnDef<Project>[] {
  return [
    {
      accessorKey: "due_date",
      enableSorting: false,
      header: "Échéance",
      cell: ({ row }) =>
        row.original.due_date ? formatDate(row.original.due_date) : "—",
    },
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
      cell: ({ row }) =>
        canManage ? (
          <div className="flex justify-end gap-1">
            {onWorkflow ? (
              <Button
                aria-label={`Configurer le workflow de ${row.original.name}`}
                onClick={() => {
                  onWorkflow(row.original);
                }}
                size="icon"
                title="Configurer les statuts"
                type="button"
                variant="ghost"
              >
                <ListChecks aria-hidden="true" className="size-4" />
              </Button>
            ) : null}
            {onExport ? (
              <Button
                aria-label={`Exporter ${row.original.name}`}
                onClick={() => {
                  onExport(row.original);
                }}
                size="icon"
                title="Exporter le modèle"
                type="button"
                variant="ghost"
              >
                <Download aria-hidden="true" className="size-4" />
              </Button>
            ) : null}
            {onDuplicate ? (
              <Button
                aria-label={`Dupliquer ${row.original.name}`}
                onClick={() => {
                  onDuplicate(row.original);
                }}
                size="icon"
                title="Dupliquer"
                type="button"
                variant="ghost"
              >
                <Copy aria-hidden="true" className="size-4" />
              </Button>
            ) : null}
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
        ) : null,
    },
  ];
}
