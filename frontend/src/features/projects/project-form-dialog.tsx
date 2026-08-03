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
  type ProjectFormValues,
  projectFormSchema,
} from "@/features/projects/schemas";
import type { Project, ProjectInput } from "@/types/project";

type ProjectFormDialogProps = {
  error?: unknown;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProjectInput) => Promise<void>;
  open: boolean;
  project?: Project | null;
};

export function ProjectFormDialog({
  error,
  isPending,
  onOpenChange,
  onSubmit,
  open,
  project,
}: ProjectFormDialogProps) {
  const isEditing = Boolean(project);
  const form = useForm<ProjectFormValues>({
    defaultValues: { description: "", name: "" },
    mode: "onChange",
    resolver: zodResolver(projectFormSchema),
  });

  useEffect(() => {
    if (open) {
      form.reset({
        description: project?.description ?? "",
        name: project?.name ?? "",
      });
    }
  }, [form, open, project]);

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
            {isEditing ? "Modifier le projet" : "Créer un projet"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Mettez à jour les informations de ce projet."
              : "Ajoutez un projet à votre workspace principal."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="project-name">
              Nom
            </label>
            <Input
              id="project-name"
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
              htmlFor="project-description"
            >
              Description
            </label>
            <Textarea
              id="project-description"
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
