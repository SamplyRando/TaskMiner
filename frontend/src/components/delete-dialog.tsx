import { ApiError } from "@/api/client";
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

type DeleteDialogProps = {
  description: string;
  error: unknown;
  isPending: boolean;
  onConfirm: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
};

export function DeleteDialog({
  description,
  error,
  isPending,
  onConfirm,
  onOpenChange,
  open,
  title,
}: DeleteDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error instanceof ApiError
              ? error.message
              : "La suppression a échoué."}
          </p>
        ) : null}
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
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
