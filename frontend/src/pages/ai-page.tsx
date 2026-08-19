import { BrainCircuit, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";

import { EntityPageHeader } from "@/components/entity-page-header";
import { ErrorState } from "@/components/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AIProjectPlan } from "@/features/ai/ai-project-plan";
import { AIApplySuccess } from "@/features/ai/ai-apply-success";
import { AIProjectChangeWorkflow } from "@/features/ai/ai-project-change-workflow";
import { AIProjectPlannerForm } from "@/features/ai/ai-project-planner-form";
import {
  useAICapabilities,
  useApplyProjectPlan,
  useGenerateProjectPlan,
} from "@/features/ai/hooks";
import type {
  AIPlanReviewValues,
  AIProjectPlannerFormValues,
} from "@/features/ai/schemas";
import { useProjects } from "@/features/projects/hooks";
import { useActiveWorkspace } from "@/hooks/use-active-workspace";
import { useSessionState } from "@/hooks/use-session-state";
import type {
  AIApplyProjectPlanRequest,
  AIApplyProjectPlanResponse,
  AIProjectPlanResponse,
} from "@/types/ai";

type GeneratedDraft = {
  idempotencyKey: string;
  plan: AIProjectPlanResponse;
  projectId: string | null;
  projectName: string | null;
  reviewValues: AIPlanReviewValues | null;
  suggestedProjectName: string;
  workspaceId: string;
};

type AppliedPlan = {
  projectName: string;
  result: AIApplyProjectPlanResponse;
};

const AI_DRAFT_STORAGE_KEY = "taskminer-ai-apply-draft-v1";
const AI_MODE_STORAGE_KEY = "taskminer-ai-mode-v1";

const suggestProjectName = (prompt: string): string => {
  const firstSentence = prompt.split(/[.!?\n]/, 1)[0]?.trim() ?? "";
  return firstSentence.slice(0, 255) || "Nouveau projet";
};

export function AIPage() {
  const workspaceState = useActiveWorkspace();
  const capabilitiesQuery = useAICapabilities();
  const generatePlan = useGenerateProjectPlan();
  const applyPlan = useApplyProjectPlan();
  const resetApplyPlan = applyPlan.reset;
  const [draft, setDraft] = useSessionState<GeneratedDraft | null>(
    AI_DRAFT_STORAGE_KEY,
    null,
  );
  const [appliedPlan, setAppliedPlan] = useState<AppliedPlan | null>(null);
  const [plannerCycle, setPlannerCycle] = useState(0);
  const [mode, setMode] = useSessionState<"plan" | "change">(
    AI_MODE_STORAGE_KEY,
    "plan",
  );
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    draft?.workspaceId ?? null,
  );
  const effectiveWorkspaceId =
    selectedWorkspaceId ?? workspaceState.activeWorkspaceId ?? "";
  const handleWorkspaceChange = useCallback(
    (workspaceId: string) => {
      setSelectedWorkspaceId((currentWorkspaceId) => {
        if (currentWorkspaceId !== null && currentWorkspaceId !== workspaceId) {
          setDraft(null);
          setAppliedPlan(null);
          resetApplyPlan();
        }
        return workspaceId;
      });
    },
    [resetApplyPlan, setDraft],
  );
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
      const plan = await generatePlan.mutateAsync({
        project_id: values.projectId || null,
        prompt: values.prompt.trim(),
        target_date: values.targetDate || null,
        workspace_id: values.workspaceId,
      });
      const selectedProject = projectsQuery.data?.items.find(
        (project) => project.id === values.projectId,
      );
      resetApplyPlan();
      setAppliedPlan(null);
      setDraft({
        idempotencyKey: crypto.randomUUID(),
        plan,
        projectId: values.projectId || null,
        projectName: selectedProject?.name ?? null,
        reviewValues: null,
        suggestedProjectName: suggestProjectName(values.prompt),
        workspaceId: values.workspaceId,
      });
    } catch {
      // The mutation error remains available to the planner form.
    }
  };

  const handleApply = async (request: AIApplyProjectPlanRequest) => {
    const result = await applyPlan.mutateAsync(request);
    setAppliedPlan({
      projectName:
        draft?.projectName ?? request.project?.name ?? "Projet TaskMiner",
      result,
    });
    setDraft(null);
  };

  const handleReviewChange = useCallback(
    (values: AIPlanReviewValues) => {
      setDraft((currentDraft) =>
        currentDraft ? { ...currentDraft, reviewValues: values } : null,
      );
    },
    [setDraft],
  );

  const handleCreateNewPlan = useCallback(() => {
    setDraft(null);
    setAppliedPlan(null);
    applyPlan.reset();
    generatePlan.reset();
    setPlannerCycle((cycle) => cycle + 1);
  }, [applyPlan, generatePlan, setDraft]);

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
            {capabilitiesQuery.data?.provider_label ?? "TaskMiner AI"}
          </div>
        }
        description="Planifiez un nouveau projet ou préparez des modifications sûres sur un projet existant."
        title="TaskMiner AI"
      />

      <div
        aria-label="Mode TaskMiner AI"
        className="bg-muted/50 inline-flex w-full rounded-xl border p-1 sm:w-auto"
        role="tablist"
      >
        <Button
          aria-selected={mode === "plan"}
          className="flex-1 sm:flex-none"
          onClick={() => {
            setMode("plan");
          }}
          role="tab"
          type="button"
          variant={mode === "plan" ? "default" : "ghost"}
        >
          Créer / planifier
        </Button>
        <Button
          aria-selected={mode === "change"}
          className="flex-1 sm:flex-none"
          onClick={() => {
            setMode("change");
          }}
          role="tab"
          type="button"
          variant={mode === "change" ? "default" : "ghost"}
        >
          Modifier un projet
        </Button>
      </div>

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
      ) : mode === "plan" ? (
        <AIProjectPlannerForm
          activeWorkspaceId={effectiveWorkspaceId || null}
          error={generatePlan.error}
          isPending={generatePlan.isPending}
          isProjectsError={projectsQuery.isError}
          isProjectsPending={projectsQuery.isPending}
          isWorkspacesPending={workspaceState.isPending}
          key={plannerCycle}
          onSubmit={handleSubmit}
          onWorkspaceChange={handleWorkspaceChange}
          projects={projectsQuery.data?.items ?? []}
          workspaces={workspaceState.workspaces}
        />
      ) : (
        <AIProjectChangeWorkflow
          activeWorkspaceId={workspaceState.activeWorkspaceId}
          isWorkspacesPending={workspaceState.isPending}
          workspaces={workspaceState.workspaces}
        />
      )}

      {mode === "plan" && draft && !applyPlan.data ? (
        <AIProjectPlan
          error={applyPlan.error}
          existingProjectId={draft.projectId}
          existingProjectName={draft.projectName}
          idempotencyKey={draft.idempotencyKey}
          initialReviewValues={draft.reviewValues}
          isPending={applyPlan.isPending}
          onApply={handleApply}
          onReviewChange={handleReviewChange}
          plan={draft.plan}
          suggestedProjectName={draft.suggestedProjectName}
          workspaceId={draft.workspaceId}
        />
      ) : null}

      {mode === "plan" && appliedPlan?.result ? (
        <AIApplySuccess
          onCreateNewPlan={handleCreateNewPlan}
          projectName={appliedPlan.projectName}
          result={appliedPlan.result}
        />
      ) : null}

      {mode === "plan" &&
      !draft &&
      !appliedPlan &&
      workspaceState.workspaces.length > 0 ? (
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
