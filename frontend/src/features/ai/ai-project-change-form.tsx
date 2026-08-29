import { zodResolver } from "@hookform/resolvers/zod";
import { ScanSearch } from "lucide-react";
import { useEffect, useRef } from "react";
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
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  type AIProjectChangeFormValues,
  aiProjectChangeFormSchema,
} from "@/features/ai/schemas";
import { getAIGenerationErrorMessage } from "@/features/ai/error-message";
import type { Project } from "@/types/project";
import type { Workspace } from "@/types/workspace";

type AIProjectChangeFormProps = {
  error: unknown;
  initialValues: AIProjectChangeFormValues;
  isPending: boolean;
  isProjectsError: boolean;
  isProjectsPending: boolean;
  isWorkspacesPending: boolean;
  onSubmit: (values: AIProjectChangeFormValues) => Promise<void>;
  onWorkspaceChange: (workspaceId: string) => void;
  projects: Project[];
  quotaReachedWorkspaceId?: string | null;
  workspaces: Workspace[];
};

export function AIProjectChangeForm({
  error,
  initialValues,
  isPending,
  isProjectsError,
  isProjectsPending,
  isWorkspacesPending,
  onSubmit,
  onWorkspaceChange,
  projects,
  quotaReachedWorkspaceId = null,
  workspaces,
}: AIProjectChangeFormProps) {
  const form = useForm<AIProjectChangeFormValues>({
    defaultValues: initialValues,
    mode: "onChange",
    resolver: zodResolver(aiProjectChangeFormSchema),
  });
  const workspaceId = useWatch({ control: form.control, name: "workspaceId" });
  const instruction = useWatch({
    control: form.control,
    name: "instruction",
  });
  const previousWorkspaceId = useRef(initialValues.workspaceId);

  useEffect(() => {
    if (!workspaceId) return;
    if (
      previousWorkspaceId.current &&
      previousWorkspaceId.current !== workspaceId
    ) {
      form.setValue("projectId", "", { shouldValidate: true });
    }
    previousWorkspaceId.current = workspaceId;
    onWorkspaceChange(workspaceId);
  }, [form, onWorkspaceChange, workspaceId]);

  const submit = form.handleSubmit(onSubmit);
  const isQuotaReached =
    Boolean(workspaceId) && workspaceId === quotaReachedWorkspaceId;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modifier un projet existant</CardTitle>
        <CardDescription>
          TaskMiner lit l’état actuel du projet et prépare un brouillon de
          modifications. Rien n’est enregistré pendant l’analyse.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="ai-change-workspace"
              >
                Workspace
              </label>
              <Select
                aria-invalid={Boolean(form.formState.errors.workspaceId)}
                disabled={isWorkspacesPending || workspaces.length === 0}
                id="ai-change-workspace"
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
                <p className="text-destructive text-sm">
                  {form.formState.errors.workspaceId.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="ai-change-project"
              >
                Projet
              </label>
              <Select
                aria-invalid={Boolean(form.formState.errors.projectId)}
                disabled={!workspaceId || isProjectsPending || isProjectsError}
                id="ai-change-project"
                {...form.register("projectId")}
              >
                <option value="">Sélectionner un projet</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
              {form.formState.errors.projectId ? (
                <p className="text-destructive text-sm">
                  {form.formState.errors.projectId.message}
                </p>
              ) : null}
              {isProjectsError ? (
                <p className="text-destructive text-sm">
                  Impossible de charger les projets de ce workspace.
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label
                className="text-sm font-medium"
                htmlFor="ai-change-instruction"
              >
                Instruction
              </label>
              <span className="text-muted-foreground text-xs">
                {instruction.length}/5 000
              </span>
            </div>
            <Textarea
              aria-describedby="ai-change-instruction-help"
              aria-invalid={Boolean(form.formState.errors.instruction)}
              className="min-h-40"
              id="ai-change-instruction"
              maxLength={5_000}
              placeholder="Décale toutes les tâches non terminées d’une semaine et mets les tâches API en priorité haute."
              {...form.register("instruction")}
            />
            {form.formState.errors.instruction ? (
              <p className="text-destructive text-sm">
                {form.formState.errors.instruction.message}
              </p>
            ) : (
              <p
                className="text-muted-foreground text-sm"
                id="ai-change-instruction-help"
              >
                Les tâches sont toujours relues depuis le serveur avant
                l’analyse et avant l’application.
              </p>
            )}
          </div>

          <FormError
            error={error}
            message={getAIGenerationErrorMessage(error)}
          />

          {isQuotaReached ? (
            <p className="text-destructive text-sm" role="alert">
              Le quota mensuel TaskMiner AI de ce workspace est atteint.
            </p>
          ) : null}

          <div className="flex justify-end border-t pt-5">
            <Button
              aria-label={
                isPending ? "Analyse des modifications en cours" : undefined
              }
              disabled={isPending || !form.formState.isValid || isQuotaReached}
              isLoading={isPending}
              loadingLabel="Analyse des modifications en cours"
              type="submit"
            >
              <ScanSearch aria-hidden="true" className="size-4" />
              Analyser les modifications
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
