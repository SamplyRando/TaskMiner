import { BrainCircuit, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";

import { EntityPageHeader } from "@/components/entity-page-header";
import { ErrorState } from "@/components/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { AIProjectPlan } from "@/features/ai/ai-project-plan";
import { AIProjectPlannerForm } from "@/features/ai/ai-project-planner-form";
import { useGenerateProjectPlan } from "@/features/ai/hooks";
import type { AIProjectPlannerFormValues } from "@/features/ai/schemas";
import { useProjects } from "@/features/projects/hooks";
import { useActiveWorkspace } from "@/hooks/use-active-workspace";

export function AIPage() {
  const workspaceState = useActiveWorkspace();
  const generatePlan = useGenerateProjectPlan();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null,
  );
  const effectiveWorkspaceId =
    selectedWorkspaceId ?? workspaceState.activeWorkspaceId ?? "";
  const handleWorkspaceChange = useCallback((workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId);
  }, []);
  const projectsQuery = useProjects(
    {
      limit: 100,
      skip: 0,
      sort: "name",
      ...(effectiveWorkspaceId ? { workspace_id: effectiveWorkspaceId } : {}),
    },
    Boolean(effectiveWorkspaceId),
  );

  const handleSubmit = async (values: AIProjectPlannerFormValues) => {
    try {
      await generatePlan.mutateAsync({
        project_id: values.projectId || null,
        prompt: values.prompt.trim(),
        target_date: values.targetDate || null,
        workspace_id: values.workspaceId,
      });
    } catch {
      // The mutation error remains available to the planner form.
    }
  };

  if (workspaceState.isError) {
    return (
      <ErrorState
        error={workspaceState.error}
        onRetry={() => void workspaceState.refetch()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <EntityPageHeader
        actions={
          <div className="border-primary/20 bg-primary/5 text-primary flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium">
            <Sparkles aria-hidden="true" className="size-3.5" />
            Mock provider
          </div>
        }
        description="Transformez le contexte d’un projet en un premier plan structuré à réviser."
        title="TaskMiner AI"
      />

      {!workspaceState.isPending && workspaceState.workspaces.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
            <BrainCircuit aria-hidden="true" className="text-primary size-10" />
            <h2 className="mt-4 text-lg font-semibold">
              Créez d’abord un workspace
            </h2>
            <p className="text-muted-foreground mt-2 max-w-lg text-sm">
              TaskMiner AI a besoin d’un workspace pour vérifier vos droits et
              rattacher le contexte du brouillon.
            </p>
          </CardContent>
        </Card>
      ) : (
        <AIProjectPlannerForm
          activeWorkspaceId={effectiveWorkspaceId || null}
          error={generatePlan.error}
          isPending={generatePlan.isPending}
          isProjectsError={projectsQuery.isError}
          isProjectsPending={projectsQuery.isPending}
          isWorkspacesPending={workspaceState.isPending}
          onSubmit={handleSubmit}
          onWorkspaceChange={handleWorkspaceChange}
          projects={projectsQuery.data?.items ?? []}
          workspaces={workspaceState.workspaces}
        />
      )}

      {generatePlan.data ? <AIProjectPlan plan={generatePlan.data} /> : null}

      {!generatePlan.data && workspaceState.workspaces.length > 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
            <BrainCircuit
              aria-hidden="true"
              className="text-muted-foreground size-9"
            />
            <h2 className="mt-4 font-semibold">
              Votre brouillon apparaîtra ici
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm">
              Décrivez un projet et TaskMiner AI proposera des tâches,
              priorités, jalons et prochaines actions.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
