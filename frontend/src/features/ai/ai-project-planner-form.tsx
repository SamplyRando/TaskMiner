import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";

import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  type AIProjectPlannerFormValues,
  aiProjectPlannerSchema,
} from "@/features/ai/schemas";
import type { Project } from "@/types/project";
import type { Workspace } from "@/types/workspace";

type AIProjectPlannerFormProps = {
  activeWorkspaceId: string | null;
  error: unknown;
  isPending: boolean;
  isProjectsError: boolean;
  isProjectsPending: boolean;
  isWorkspacesPending: boolean;
  onSubmit: (values: AIProjectPlannerFormValues) => Promise<void>;
  onWorkspaceChange: (workspaceId: string) => void;
  projects: Project[];
  workspaces: Workspace[];
};

export function AIProjectPlannerForm({
  activeWorkspaceId,
  error,
  isPending,
  isProjectsError,
  isProjectsPending,
  isWorkspacesPending,
  onSubmit,
  onWorkspaceChange,
  projects,
  workspaces,
}: AIProjectPlannerFormProps) {
  const form = useForm<AIProjectPlannerFormValues>({
    defaultValues: {
      projectId: "",
      prompt: "",
      targetDate: "",
      workspaceId: activeWorkspaceId ?? "",
    },
    mode: "onChange",
    resolver: zodResolver(aiProjectPlannerSchema),
  });
  const selectedWorkspaceId = useWatch({
    control: form.control,
    name: "workspaceId",
  });
  const prompt = useWatch({ control: form.control, name: "prompt" });

  useEffect(() => {
    if (!form.getValues("workspaceId") && activeWorkspaceId) {
      form.setValue("workspaceId", activeWorkspaceId, {
        shouldValidate: true,
      });
    }
  }, [activeWorkspaceId, form]);

  useEffect(() => {
    form.setValue("projectId", "");
    if (selectedWorkspaceId) {
      onWorkspaceChange(selectedWorkspaceId);
    }
  }, [form, onWorkspaceChange, selectedWorkspaceId]);

  const submit = form.handleSubmit(async (values) => {
    await onSubmit(values);
  });
  const isSubmitDisabled =
    isPending ||
    isWorkspacesPending ||
    workspaces.length === 0 ||
    !form.formState.isValid;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Préparer un plan de projet</CardTitle>
        <CardDescription>
          Le résultat reste un brouillon : aucune tâche ne sera créée
          automatiquement.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="ai-workspace">
                Workspace
              </label>
              <Select
                aria-describedby={
                  form.formState.errors.workspaceId
                    ? "ai-workspace-error"
                    : undefined
                }
                aria-invalid={Boolean(form.formState.errors.workspaceId)}
                disabled={isWorkspacesPending || workspaces.length === 0}
                id="ai-workspace"
                {...form.register("workspaceId")}
              >
                <option value="">Sélectionner un workspace</option>
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </Select>
              {form.formState.errors.workspaceId ? (
                <p className="text-destructive text-sm" id="ai-workspace-error">
                  {form.formState.errors.workspaceId.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="ai-project">
                Projet{" "}
                <span className="text-muted-foreground">(optionnel)</span>
              </label>
              <Select
                disabled={
                  !selectedWorkspaceId || isProjectsPending || isProjectsError
                }
                id="ai-project"
                {...form.register("projectId")}
              >
                <option value="">Aucun projet spécifique</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
              {isProjectsError ? (
                <p className="text-destructive text-sm">
                  Impossible de charger les projets de ce workspace.
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="ai-target-date">
              Date cible{" "}
              <span className="text-muted-foreground">(optionnelle)</span>
            </label>
            <Input
              className="max-w-sm"
              id="ai-target-date"
              type="date"
              {...form.register("targetDate")}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium" htmlFor="ai-prompt">
                Brief du projet
              </label>
              <span className="text-muted-foreground text-xs">
                {prompt.length}/5 000
              </span>
            </div>
            <Textarea
              aria-describedby={
                form.formState.errors.prompt
                  ? "ai-prompt-error"
                  : "ai-prompt-help"
              }
              aria-invalid={Boolean(form.formState.errors.prompt)}
              className="min-h-48"
              id="ai-prompt"
              maxLength={5_000}
              placeholder="Décrivez l’objectif, l’échéance, les contraintes et tout élément que TaskMiner doit prendre en compte…"
              {...form.register("prompt")}
            />
            {form.formState.errors.prompt ? (
              <p className="text-destructive text-sm" id="ai-prompt-error">
                {form.formState.errors.prompt.message}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm" id="ai-prompt-help">
                Donnez assez de contexte pour obtenir des tâches, priorités et
                jalons utiles.
              </p>
            )}
          </div>

          <FormError error={error} />

          <div className="flex flex-col items-start justify-between gap-3 border-t pt-5 sm:flex-row sm:items-center">
            <p className="text-muted-foreground text-xs">
              TaskMiner AI ne modifiera aucune donnée pendant ce sprint.
            </p>
            <Button
              disabled={isSubmitDisabled}
              isLoading={isPending}
              loadingLabel="Génération du plan en cours"
              type="submit"
            >
              <Sparkles aria-hidden="true" className="size-4" />
              {isPending ? "Génération…" : "Générer le plan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
