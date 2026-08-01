import { MailCheck } from "lucide-react";

import { FormError } from "@/components/form-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  invitationRoleLabels,
  invitationStatusClasses,
  invitationStatusLabels,
} from "@/features/invitations/presentation";
import { formatDateTime } from "@/lib/format";
import type { WorkspaceInvitation } from "@/types/invitation";

type RecipientInvitationCardProps = {
  acceptError: unknown;
  currentUserEmail: string | null;
  invitation: WorkspaceInvitation;
  isAccepting: boolean;
  isDeclining: boolean;
  onAccept: () => Promise<void>;
  onDecline: () => Promise<void>;
  declineError: unknown;
};

export function RecipientInvitationCard({
  acceptError,
  currentUserEmail,
  declineError,
  invitation,
  isAccepting,
  isDeclining,
  onAccept,
  onDecline,
}: RecipientInvitationCardProps) {
  const isRecipient =
    currentUserEmail?.toLowerCase() === invitation.email.toLowerCase();
  const canRespond = invitation.status === "pending" && isRecipient;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MailCheck aria-hidden="true" className="text-primary size-5" />
            Votre invitation
          </CardTitle>
          <p className="text-muted-foreground mt-2 text-sm">
            Invitation pour {invitation.email}, rôle{" "}
            {invitationRoleLabels[invitation.role]}.
          </p>
        </div>
        <Badge className={invitationStatusClasses[invitation.status]}>
          {invitationStatusLabels[invitation.status]}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Expire le {formatDateTime(invitation.expires_at)}
        </p>
        {!isRecipient ? (
          <p className="text-destructive text-sm" role="alert">
            Cette invitation est destinée à une autre adresse email.
          </p>
        ) : null}
        <FormError error={acceptError ?? declineError} />
        {canRespond ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              disabled={isAccepting || isDeclining}
              onClick={() => void onAccept()}
              type="button"
            >
              {isAccepting ? <Spinner /> : null}
              Accepter
            </Button>
            <Button
              disabled={isAccepting || isDeclining}
              onClick={() => void onDecline()}
              type="button"
              variant="outline"
            >
              {isDeclining ? <Spinner /> : null}
              Refuser
            </Button>
          </div>
        ) : null}
        {invitation.status !== "pending" && !acceptError && !declineError ? (
          <p className="text-muted-foreground text-sm">
            Cette invitation ne nécessite plus aucune action.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
