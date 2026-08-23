import type { ColumnDef } from "@tanstack/react-table";
import { Ban, Send } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getInviterLabel,
  invitationDeliveryClasses,
  invitationDeliveryLabels,
  invitationRoleLabels,
  invitationStatusClasses,
  invitationStatusLabels,
} from "@/features/invitations/presentation";
import { formatDateTime } from "@/lib/format";
import type { WorkspaceInvitation } from "@/types/invitation";

type InvitationColumnsOptions = {
  canManage: boolean;
  isResending: (invitation: WorkspaceInvitation) => boolean;
  onRevoke: (invitation: WorkspaceInvitation) => void;
  onResend: (invitation: WorkspaceInvitation) => void;
};

export const getInvitationColumns = ({
  canManage,
  isResending,
  onRevoke,
  onResend,
}: InvitationColumnsOptions): ColumnDef<WorkspaceInvitation>[] => [
  {
    accessorKey: "email_delivery_status",
    cell: ({ row }) => (
      <Badge
        className={
          invitationDeliveryClasses[row.original.email_delivery_status]
        }
      >
        {invitationDeliveryLabels[row.original.email_delivery_status]}
      </Badge>
    ),
    enableSorting: false,
    header: "Livraison",
  },
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
        <div className="flex items-center gap-1">
          <Button
            aria-label={`Renvoyer l’invitation à ${row.original.email}`}
            disabled={isResending(row.original)}
            onClick={() => {
              onResend(row.original);
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Send aria-hidden="true" className="size-4" />
            Renvoyer
          </Button>
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
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      ),
    enableSorting: false,
    header: "Actions",
    id: "actions",
  },
];
