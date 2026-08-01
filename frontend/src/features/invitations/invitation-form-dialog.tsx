import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

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
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  type InvitationFormValues,
  invitationFormSchema,
} from "@/features/invitations/schemas";
import type { InvitationCreate } from "@/types/invitation";

type InvitationFormDialogProps = {
  error: unknown;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InvitationCreate) => Promise<void>;
  open: boolean;
};

export function InvitationFormDialog({
  error,
  isPending,
  onOpenChange,
  onSubmit,
  open,
}: InvitationFormDialogProps) {
  const form = useForm<InvitationFormValues>({
    defaultValues: { email: "", role: "member" },
    mode: "onChange",
    resolver: zodResolver(invitationFormSchema),
  });

  useEffect(() => {
    if (open) {
      form.reset({ email: "", role: "member" });
    }
  }, [form, open]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit({
      email: values.email.trim().toLowerCase(),
      role: values.role,
    });
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter un membre</DialogTitle>
          <DialogDescription>
            Envoyez une invitation valable sept jours pour ce workspace.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="invitation-email">
              Adresse email
            </label>
            <Input
              aria-invalid={Boolean(form.formState.errors.email)}
              autoComplete="email"
              autoFocus
              id="invitation-email"
              type="email"
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p className="text-destructive text-sm" role="alert">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="invitation-role">
              Rôle
            </label>
            <Select id="invitation-role" {...form.register("role")}>
              <option value="admin">Administrateur</option>
              <option value="member">Membre</option>
              <option value="viewer">Lecteur</option>
            </Select>
          </div>

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
              disabled={isPending || !form.formState.isValid}
              type="submit"
            >
              {isPending ? <Spinner /> : null}
              Envoyer l’invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
