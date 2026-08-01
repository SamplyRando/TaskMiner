import type { ColumnDef } from "@tanstack/react-table";
import { Ban } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getInviterLabel,
  invitationRoleLabels,
  invitationStatusClasses,
  invitationStatusLabels,
} from "@/features/invitations/presentation";
import { formatDateTime } from "@/lib/format";
import type { WorkspaceInvitation } from "@/types/invitation";

type InvitationColumnsOptions = {
  canManage: boolean;
  onRevoke: (invitation: WorkspaceInvitation) => void;
};

export const getInvitationColumns = ({
  canManage,
  onRevoke,
}: InvitationColumnsOptions): ColumnDef<WorkspaceInvitation>[] => [
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
  },
  {
    accessorKey: "role",
    cell: ({ row }) => invitationRoleLabels[row.original.role],
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Rôle" />
    ),
  },
  {
    accessorKey: "status",
    cell: ({ row }) => (
      <Badge className={invitationStatusClasses[row.original.status]}>
        {invitationStatusLabels[row.original.status]}
      </Badge>
    ),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Statut" />
    ),
  },
  {
    accessorFn: getInviterLabel,
    cell: ({ row }) => (
      <div>
        <p>{getInviterLabel(row.original)}</p>
        {row.original.invited_by ? (
          <p className="text-muted-foreground text-xs">
            {row.original.invited_by.email}
          </p>
        ) : null}
      </div>
    ),
    enableSorting: false,
    header: "Invité par",
    id: "invited_by",
  },
  {
    accessorKey: "created_at",
    cell: ({ row }) => formatDateTime(row.original.created_at),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Créée le" />
    ),
  },
  {
    accessorKey: "expires_at",
    cell: ({ row }) => formatDateTime(row.original.expires_at),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Expiration" />
    ),
  },
  {
    cell: ({ row }) =>
      canManage && row.original.status === "pending" ? (
        <Button
          aria-label={`Révoquer l’invitation de ${row.original.email}`}
          onClick={() => {
            onRevoke(row.original);
          }}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Ban aria-hidden="true" className="size-4" />
          Révoquer
        </Button>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      ),
    enableSorting: false,
    header: "Actions",
    id: "actions",
  },
];
