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
import { cn } from "@/lib/utils";
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
    accessorKey: "email",
    cell: ({ row }) => (
      <span
        className="block max-w-52 truncate font-medium"
        title={row.original.email}
      >
        {row.original.email}
      </span>
    ),
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
      <Badge
        className={cn(
          "whitespace-nowrap",
          invitationStatusClasses[row.original.status],
        )}
      >
        {invitationStatusLabels[row.original.status]}
      </Badge>
    ),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Statut" />
    ),
  },
  {
    accessorKey: "email_delivery_status",
    cell: ({ row }) => (
      <Badge
        className={cn(
          "whitespace-nowrap",
          invitationDeliveryClasses[row.original.email_delivery_status],
        )}
      >
        {invitationDeliveryLabels[row.original.email_delivery_status]}
      </Badge>
    ),
    enableSorting: false,
    header: "Livraison",
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
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {formatDateTime(row.original.created_at)}
      </span>
    ),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Créée le" />
    ),
  },
  {
    accessorKey: "expires_at",
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {formatDateTime(row.original.expires_at)}
      </span>
    ),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Expiration" />
    ),
  },
  {
    cell: ({ row }) =>
      canManage && row.original.status === "pending" ? (
        <div className="flex items-center gap-0.5">
          <Button
            aria-label={`Renvoyer l’invitation à ${row.original.email}`}
            className="text-muted-foreground hover:text-foreground size-8"
            disabled={isResending(row.original)}
            onClick={() => {
              onResend(row.original);
            }}
            size="icon"
            title="Renvoyer"
            type="button"
            variant="ghost"
          >
            <Send aria-hidden="true" className="size-4" />
          </Button>
          <Button
            aria-label={`Révoquer l’invitation de ${row.original.email}`}
            className="text-muted-foreground hover:text-destructive size-8"
            onClick={() => {
              onRevoke(row.original);
            }}
            size="icon"
            title="Révoquer"
            type="button"
            variant="ghost"
          >
            <Ban aria-hidden="true" className="size-4" />
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
