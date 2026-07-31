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
import { Textarea } from "@/components/ui/textarea";
import { type TaskFormValues, taskFormSchema } from "@/features/tasks/schemas";
import { toDateTimeLocal } from "@/lib/format";
import type { Project } from "@/types/project";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Task,
  type TaskInput,
} from "@/types/task";

const statusLabels = {
  done: "Terminée",
  in_progress: "En cours",
  todo: "À faire",
} as const;

const priorityLabels = {
  high: "Haute",
  low: "Basse",
  medium: "Moyenne",
  urgent: "Urgente",
} as const;

type TaskFormDialogProps = {
  error?: unknown;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (projectId: string, data: TaskInput) => Promise<void>;
  open: boolean;
  projects: Project[];
  task?: Task | null;
};

export function TaskFormDialog({
  error,
  isPending,
  onOpenChange,
  onSubmit,
  open,
  projects,
  task,
}: TaskFormDialogProps) {
  const isEditing = Boolean(task);
  const form = useForm<TaskFormValues>({
    defaultValues: {
      description: "",
      dueDate: "",
      priority: "medium",
      projectId: projects[0]?.id ?? "",
      status: "todo",
      title: "",
    },
    resolver: zodResolver(taskFormSchema),
  });

  useEffect(() => {
    if (open) {
      form.reset({
        description: task?.description ?? "",
        dueDate: toDateTimeLocal(task?.due_date ?? null),
        priority: task?.priority ?? "medium",
        projectId: task?.project_id ?? projects[0]?.id ?? "",
        status: task?.status ?? "todo",
        title: task?.title ?? "",
      });
    }
  }, [form, open, projects, task]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values.projectId, {
      description: values.description.trim() || null,
      due_date: values.dueDate ? new Date(values.dueDate).toISOString() : null,
      priority: values.priority,
      status: values.status,
      title: values.title.trim(),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier la tâche" : "Créer une tâche"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Mettez à jour les informations de cette tâche."
              : "Ajoutez une tâche à l’un de vos projets."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="task-project">
              Projet
            </label>
            {isEditing ? (
              <>
                <Input
                  id="task-project"
                  disabled
                  value={
                    projects.find((project) => project.id === task?.project_id)
                      ?.name ?? "Projet inconnu"
                  }
                />
                <input type="hidden" {...form.register("projectId")} />
              </>
            ) : (
              <Select
                id="task-project"
                aria-invalid={Boolean(form.formState.errors.projectId)}
                {...form.register("projectId")}
              >
                <option value="">Sélectionner un projet</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            )}
            {form.formState.errors.projectId ? (
              <p className="text-destructive text-sm">
                {form.formState.errors.projectId.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="task-title">
              Titre
            </label>
            <Input
              id="task-title"
              autoFocus
              aria-invalid={Boolean(form.formState.errors.title)}
              {...form.register("title")}
            />
            {form.formState.errors.title ? (
              <p className="text-destructive text-sm">
                {form.formState.errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="task-description">
              Description
            </label>
            <Textarea
              id="task-description"
              rows={3}
              {...form.register("description")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="task-status">
                Statut
              </label>
              <Select id="task-status" {...form.register("status")}>
                {TASK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="task-priority">
                Priorité
              </label>
              <Select id="task-priority" {...form.register("priority")}>
                {TASK_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priorityLabels[priority]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="task-due-date">
              Échéance
            </label>
            <Input
              id="task-due-date"
              type="datetime-local"
              {...form.register("dueDate")}
            />
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
