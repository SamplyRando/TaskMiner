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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  type WorkspaceFormValues,
  workspaceFormSchema,
} from "@/features/workspaces/schemas";
import type { Workspace, WorkspaceInput } from "@/types/workspace";

type WorkspaceFormDialogProps = {
  error?: unknown;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: WorkspaceInput) => Promise<void>;
  open: boolean;
  workspace?: Workspace | null;
};

export function WorkspaceFormDialog({
  error,
  isPending,
  onOpenChange,
  onSubmit,
  open,
  workspace,
}: WorkspaceFormDialogProps) {
  const isEditing = Boolean(workspace);
  const form = useForm<WorkspaceFormValues>({
    defaultValues: { description: "", name: "" },
    mode: "onChange",
    resolver: zodResolver(workspaceFormSchema),
  });

  useEffect(() => {
    if (open) {
      form.reset({
        description: workspace?.description ?? "",
        name: workspace?.name ?? "",
      });
    }
  }, [form, open, workspace]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit({
      description: values.description.trim() || null,
      name: values.name.trim(),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le workspace" : "Créer un workspace"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Mettez à jour les informations de cet espace de travail."
              : "Créez un espace pour organiser vos projets."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="workspace-name">
              Nom
            </label>
            <Input
              id="workspace-name"
              autoFocus
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p className="text-destructive text-sm">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor="workspace-description"
            >
              Description
            </label>
            <Textarea
              id="workspace-description"
              rows={4}
              {...form.register("description")}
            />
            {form.formState.errors.description ? (
              <p className="text-destructive text-sm">
                {form.formState.errors.description.message}
              </p>
            ) : null}
          </div>

          <FormError error={error} />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Spinner className="mr-2" /> : null}
              {isEditing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
