import { Ban, CalendarClock, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  getInviterLabel,
  invitationRoleLabels,
  invitationStatusClasses,
  invitationStatusLabels,
} from "@/features/invitations/presentation";
import { formatDateTime } from "@/lib/format";
import type { WorkspaceInvitation } from "@/types/invitation";

type InvitationCardProps = {
  canManage: boolean;
  invitation: WorkspaceInvitation;
  onRevoke: (invitation: WorkspaceInvitation) => void;
};

export function InvitationCard({
  canManage,
  invitation,
  onRevoke,
}: InvitationCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{invitation.email}</p>
            <p className="text-muted-foreground text-sm">
              {invitationRoleLabels[invitation.role]}
            </p>
          </div>
          <Badge className={invitationStatusClasses[invitation.status]}>
            {invitationStatusLabels[invitation.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0 text-sm">
        <div className="text-muted-foreground flex items-start gap-2">
          <UserRound aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>Invité par {getInviterLabel(invitation)}</span>
        </div>
        <div className="text-muted-foreground flex items-start gap-2">
          <CalendarClock
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
          />
          <span>Expire le {formatDateTime(invitation.expires_at)}</span>
        </div>
        <p className="text-muted-foreground text-xs">
          Créée le {formatDateTime(invitation.created_at)}
        </p>
        {canManage && invitation.status === "pending" ? (
          <Button
            className="w-full"
            onClick={() => {
              onRevoke(invitation);
            }}
            type="button"
            variant="outline"
          >
            <Ban aria-hidden="true" className="size-4" />
            Révoquer
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
