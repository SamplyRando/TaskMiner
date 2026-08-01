import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import type { WorkspaceInvitation } from "@/types/invitation";

type InvitationRevokeDialogProps = {
  error: unknown;
  invitation: WorkspaceInvitation | null;
  isPending: boolean;
  onConfirm: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function InvitationRevokeDialog({
  error,
  invitation,
  isPending,
  onConfirm,
  onOpenChange,
  open,
}: InvitationRevokeDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Révoquer cette invitation ?</DialogTitle>
          <DialogDescription>
            {invitation
              ? `${invitation.email} ne pourra plus accepter cette invitation.`
              : "Cette invitation ne pourra plus être acceptée."}
          </DialogDescription>
        </DialogHeader>
        <FormError error={error} />
        <DialogFooter>
          <Button
            disabled={isPending}
            onClick={() => {
              onOpenChange(false);
            }}
            type="button"
            variant="outline"
          >
            Annuler
          </Button>
          <Button
            disabled={isPending}
            onClick={() => void onConfirm()}
            type="button"
            variant="destructive"
          >
            {isPending ? <Spinner /> : null}
            Révoquer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
