import { Ban, CalendarClock, MailCheck, Send, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

type InvitationCardProps = {
  canManage: boolean;
  invitation: WorkspaceInvitation;
  onRevoke: (invitation: WorkspaceInvitation) => void;
  onResend: (invitation: WorkspaceInvitation) => void;
  isResending: boolean;
};

export function InvitationCard({
  canManage,
  invitation,
  isResending,
  onRevoke,
  onResend,
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
        <div className="flex items-center gap-2">
          <MailCheck
            aria-hidden="true"
            className="text-muted-foreground size-4"
          />
          <Badge
            className={
              invitationDeliveryClasses[invitation.email_delivery_status]
            }
          >
            {invitationDeliveryLabels[invitation.email_delivery_status]}
          </Badge>
        </div>
        {canManage && invitation.status === "pending" ? (
          <div className="grid grid-cols-2 gap-2">
            <Button
              disabled={isResending}
              onClick={() => {
                onResend(invitation);
              }}
              type="button"
              variant="outline"
            >
              <Send aria-hidden="true" className="size-4" />
              {isResending ? "Envoi…" : "Renvoyer"}
            </Button>
            <Button
              onClick={() => {
                onRevoke(invitation);
              }}
              type="button"
              variant="outline"
            >
              <Ban aria-hidden="true" className="size-4" />
              Révoquer
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
