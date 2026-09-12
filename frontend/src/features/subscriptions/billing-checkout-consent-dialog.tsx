import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getBillingErrorMessage } from "@/features/subscriptions/billing-errors";

type BillingCheckoutConsentDialogProps = {
  error: unknown;
  isPending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  workspaceName: string;
};

export function BillingCheckoutConsentDialog({
  error,
  isPending,
  onConfirm,
  onOpenChange,
  open,
  workspaceName,
}: BillingCheckoutConsentDialogProps) {
  const [immediateServiceRequested, setImmediateServiceRequested] =
    useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (isPending && !nextOpen) return;
    onOpenChange(nextOpen);
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Commencer TaskMiner Pro immédiatement</DialogTitle>
          <DialogDescription>
            Confirmez votre demande avant de continuer vers le paiement pour le
            workspace « {workspaceName} ».
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!immediateServiceRequested || isPending) return;
            onConfirm();
          }}
        >
          <label className="border-border bg-muted/35 flex cursor-pointer items-start gap-3 rounded-lg border p-4 text-sm leading-6">
            <input
              checked={immediateServiceRequested}
              className="accent-primary mt-1 size-4 shrink-0"
              disabled={isPending}
              onChange={(event) => {
                setImmediateServiceRequested(event.target.checked);
              }}
              type="checkbox"
            />
            <span>
              Je demande que l’accès à TaskMiner Pro commence immédiatement,
              avant la fin du délai légal de rétractation de 14 jours.
            </span>
          </label>

          <p className="text-muted-foreground text-sm leading-6">
            Si vous exercez votre droit de rétractation après le début du
            service, un montant proportionnel au service déjà fourni peut être
            dû, selon les règles applicables.
          </p>

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {getBillingErrorMessage(error)}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              disabled={isPending}
              onClick={() => {
                handleOpenChange(false);
              }}
              type="button"
              variant="outline"
            >
              Annuler
            </Button>
            <Button
              disabled={!immediateServiceRequested}
              isLoading={isPending}
              loadingLabel="Ouverture de Stripe"
              type="submit"
            >
              Continuer vers Stripe
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
