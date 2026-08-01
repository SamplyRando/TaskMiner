import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import {
  activityEventLabels,
  activityResourceLabels,
  formatActor,
  getChangeSummary,
} from "@/lib/activity-presentation";
import type { AuditLog } from "@/types/audit";

type AuditColumnActions = {
  onView: (log: AuditLog) => void;
};

export function getAuditColumns({
  onView,
}: AuditColumnActions): ColumnDef<AuditLog>[] {
  return [
    {
      accessorKey: "created_at",
      enableSorting: false,
      header: "Date",
      cell: ({ row }) => (
        <time
          className="text-muted-foreground whitespace-nowrap"
          dateTime={row.original.created_at}
        >
          {formatDateTime(row.original.created_at)}
        </time>
      ),
    },
    {
      accessorKey: "actor_id",
      enableSorting: false,
      header: "Acteur",
      cell: ({ row }) => formatActor(row.original.actor_id),
    },
    {
      accessorKey: "event",
      enableSorting: false,
      header: "Événement",
      cell: ({ row }) => (
        <span className="font-medium">
          {activityEventLabels[row.original.event]}
        </span>
      ),
    },
    {
      accessorKey: "resource",
      enableSorting: false,
      header: "Ressource",
      cell: ({ row }) => (
        <Badge variant="outline">
          {activityResourceLabels[row.original.resource]}
        </Badge>
      ),
    },
    {
      accessorKey: "resource_id",
      enableSorting: false,
      header: "Identifiant",
      cell: ({ row }) => (
        <code className="text-muted-foreground block max-w-36 truncate text-xs">
          {row.original.resource_id}
        </code>
      ),
    },
    {
      id: "changes",
      enableSorting: false,
      header: "Changements",
      cell: ({ row }) => (
        <span className="text-muted-foreground block max-w-64 truncate text-sm">
          {getChangeSummary(
            row.original.old_values,
            row.original.new_values,
            row.original.metadata,
          )}
        </span>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <Button
          aria-label={`Voir le détail de ${activityEventLabels[row.original.event]}`}
          onClick={() => {
            onView(row.original);
          }}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Eye aria-hidden="true" className="size-4" />
        </Button>
      ),
    },
  ];
}
