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
import {
  type TaskAssignmentValues,
  taskAssignmentSchema,
} from "@/features/tasks/schemas";
import type { Task } from "@/types/task";

type TaskAssignmentDialogProps = {
  currentUserId: string;
  error?: unknown;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (assignedUserId: string | null) => Promise<void>;
  open: boolean;
  task: Task | null;
};

export function TaskAssignmentDialog({
  currentUserId,
  error,
  isPending,
  onOpenChange,
  onSubmit,
  open,
  task,
}: TaskAssignmentDialogProps) {
  const form = useForm<TaskAssignmentValues>({
    defaultValues: { assignedUserId: "" },
    resolver: zodResolver(taskAssignmentSchema),
  });

  useEffect(() => {
    if (open) {
      form.reset({ assignedUserId: task?.assigned_user_id ?? "" });
    }
  }, [form, open, task]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values.assignedUserId || null);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assigner la tâche</DialogTitle>
          <DialogDescription>
            Saisissez l’identifiant d’un membre actif du workspace, ou laissez
            le champ vide pour retirer l’assignation.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="assigned-user-id">
              Identifiant utilisateur
            </label>
            <Input
              id="assigned-user-id"
              placeholder="UUID de l’utilisateur"
              aria-invalid={Boolean(form.formState.errors.assignedUserId)}
              {...form.register("assignedUserId")}
            />
            {form.formState.errors.assignedUserId ? (
              <p className="text-destructive text-sm">
                {form.formState.errors.assignedUserId.message}
              </p>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                form.setValue("assignedUserId", currentUserId, {
                  shouldValidate: true,
                });
              }}
            >
              M’assigner cette tâche
            </Button>
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
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
