import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import type { Workspace } from "@/types/workspace";

type WorkspaceColumnActions = {
  currentUserId: string;
  onDelete: (workspace: Workspace) => void;
  onEdit: (workspace: Workspace) => void;
};

export function getWorkspaceColumns({
  currentUserId,
  onDelete,
  onEdit,
}: WorkspaceColumnActions): ColumnDef<Workspace>[] {
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
      cell: ({ row }) =>
        row.original.owner_id === currentUserId ? (
          <div className="flex justify-end gap-0.5">
            <Button
              aria-label={`Modifier ${row.original.name}`}
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
              aria-label={`Supprimer ${row.original.name}`}
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
          </div>
        ) : null,
    },
  ];
}
