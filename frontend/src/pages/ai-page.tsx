import { useCallback, useState } from "react";

import { ErrorState } from "@/components/error-state";
import { Facet } from "@/components/ui/facet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AIProjectPlan } from "@/features/ai/ai-project-plan";
import { AIApplySuccess } from "@/features/ai/ai-apply-success";
import { AIProjectChangeWorkflow } from "@/features/ai/ai-project-change-workflow";
import { AIGenerationStatus } from "@/features/ai/ai-generation-status";
import { AIProjectPlannerForm } from "@/features/ai/ai-project-planner-form";
import { AIDraftIllustration, AIFlowStrip } from "@/features/ai/ai-signature";
import { AIUsagePanel } from "@/features/ai/ai-usage-panel";
import {
  useAICapabilities,
  useAIWorkspaceUsage,
  useApplyProjectPlan,
  useGenerateProjectPlan,
} from "@/features/ai/hooks";
import type {
  AIPlanReviewValues,
  AIProjectPlannerFormValues,
} from "@/features/ai/schemas";
import { useProjects } from "@/features/projects/hooks";
import { useWorkspacePermissions } from "@/features/workspaces/permissions-hooks";
import { useWorkspaceSubscription } from "@/features/subscriptions/hooks";
import { useAssignableWorkspaceMembers } from "@/features/workspaces/hooks";
import { useActiveWorkspace } from "@/hooks/use-active-workspace";
import { useSessionState } from "@/hooks/use-session-state";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
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
  const currentUserId = useAuthStore((state) => state.currentUser?.id ?? "");
  const workspaceState = useActiveWorkspace();
  const selectWorkspace = workspaceState.selectWorkspace;
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
  const [usageWorkspaceId, setUsageWorkspaceId] = useState<string | null>(
    draft?.workspaceId ?? null,
  );
  const effectiveWorkspaceId =
    selectedWorkspaceId ?? workspaceState.activeWorkspaceId ?? "";
  const effectiveUsageWorkspaceId =
    usageWorkspaceId ?? workspaceState.activeWorkspaceId;
  const permissionsQuery = useWorkspacePermissions(effectiveUsageWorkspaceId);
  const canViewUsage =
    permissionsQuery.data?.role === "owner" ||
    permissionsQuery.data?.role === "admin";
  const usageQuery = useAIWorkspaceUsage(
    effectiveUsageWorkspaceId,
    canViewUsage,
  );
  const subscriptionQuery = useWorkspaceSubscription(effectiveUsageWorkspaceId);
  const quotaReachedWorkspaceId =
    subscriptionQuery.data &&
    subscriptionQuery.data.usage.ai_requests_this_month >=
      subscriptionQuery.data.limits.ai_requests_per_month
      ? effectiveUsageWorkspaceId
      : null;
  const handleWorkspaceChange = useCallback(
    (workspaceId: string) => {
      selectWorkspace(workspaceId);
      setUsageWorkspaceId(workspaceId);
      setSelectedWorkspaceId((currentWorkspaceId) => {
        if (currentWorkspaceId !== null && currentWorkspaceId !== workspaceId) {
          setDraft(null);
          setAppliedPlan(null);
          resetApplyPlan();
        }
        return workspaceId;
      });
    },
    [resetApplyPlan, selectWorkspace, setDraft],
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
  const assignableMembersQuery = useAssignableWorkspaceMembers(
    draft?.workspaceId ?? null,
    Boolean(draft),
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

  const handleCancelPlan = useCallback(() => {
    setDraft(null);
    setAppliedPlan(null);
    applyPlan.reset();
    generatePlan.reset();
  }, [applyPlan, generatePlan, setDraft]);

  const handleCreateNewPlan = useCallback(() => {
    setDraft(null);
    setAppliedPlan(null);
    applyPlan.reset();
    generatePlan.reset();
    setPlannerCycle((cycle) => cycle + 1);
  }, [applyPlan, generatePlan, setDraft]);

  const handleChangeUsageWorkspace = useCallback(
    (workspaceId: string) => {
      setUsageWorkspaceId(workspaceId);
      selectWorkspace(workspaceId);
    },
    [selectWorkspace],
  );

  if (workspaceState.isError) {
    return (
      <ErrorState
        error={workspaceState.error}
        onRetry={() => void workspaceState.refetch()}
      />
    );
  }

  // Mirrors the existing state only (no new step logic): brief → draft
  // generation → human review → applied.
  const flowStep =
    mode !== "plan"
      ? null
      : appliedPlan?.result
        ? 3
        : draft
          ? 2
          : generatePlan.isPending
            ? 1
            : 0;

  return (
    <div className="brand-scope mx-auto w-full max-w-[96rem] space-y-6">
      <header className="bg-card rounded-card relative overflow-hidden border shadow-xs">
        <div
          aria-hidden="true"
          className="bg-brand-subtle pointer-events-none absolute -top-16 -right-16 size-48 rotate-45 opacity-70"
        />
        <div className="relative flex flex-col gap-4 px-5 pt-5 pb-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-label text-brand flex items-center gap-2">
              <Facet className="size-3.5" />
              Planification assistée, validée par vous
            </p>
            <h1 className="text-page-title mt-2">TaskMiner AI</h1>
            <p className="text-muted-foreground mt-1.5 max-w-2xl">
              Décrivez le résultat attendu, révisez le brouillon, puis appliquez
              uniquement ce que vous validez.
            </p>
          </div>
          <p className="text-muted-foreground shrink-0 text-xs">
            Fournisseur :{" "}
            {capabilitiesQuery.data?.provider_label ?? "TaskMiner AI"}
          </p>
        </div>
        <div className="relative px-5 pb-5 sm:px-6">
          <AIFlowStrip current={flowStep} />
        </div>
      </header>

      <div
        aria-label="Mode TaskMiner AI"
        className="bg-surface-sunken inline-flex w-full gap-1 rounded-lg border p-1 sm:w-auto"
        role="tablist"
      >
        <Button
          aria-selected={mode === "plan"}
          className={cn(
            "h-8 flex-1 sm:flex-none",
            mode === "plan" &&
              "bg-surface text-foreground hover:bg-surface shadow-xs",
          )}
          onClick={() => {
            setMode("plan");
          }}
          role="tab"
          type="button"
          variant="ghost"
        >
          Créer / planifier
        </Button>
        <Button
          aria-selected={mode === "change"}
          className={cn(
            "h-8 flex-1 sm:flex-none",
            mode === "change" &&
              "bg-surface text-foreground hover:bg-surface shadow-xs",
          )}
          onClick={() => {
            setMode("change");
          }}
          role="tab"
          type="button"
          variant="ghost"
        >
          Modifier un projet
        </Button>
      </div>

      {canViewUsage ? (
        <AIUsagePanel
          compact
          data={usageQuery.data}
          error={usageQuery.error}
          isPending={usageQuery.isPending}
          onRetry={() => void usageQuery.refetch()}
        />
      ) : null}

      {!workspaceState.isPending && workspaceState.workspaces.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
            <AIDraftIllustration />
            <h2 className="mt-6 text-lg font-semibold">
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
          quotaReachedWorkspaceId={quotaReachedWorkspaceId}
          onSubmit={handleSubmit}
          onWorkspaceChange={handleWorkspaceChange}
          projects={projectsQuery.data?.items ?? []}
          workspaces={workspaceState.workspaces}
        />
      ) : (
        <AIProjectChangeWorkflow
          activeWorkspaceId={workspaceState.activeWorkspaceId}
          isWorkspacesPending={workspaceState.isPending}
          onUsageWorkspaceChange={handleChangeUsageWorkspace}
          quotaReachedWorkspaceId={quotaReachedWorkspaceId}
          workspaces={workspaceState.workspaces}
        />
      )}

      {mode === "plan" && generatePlan.isPending ? (
        <AIGenerationStatus mode="plan" />
      ) : null}

      {mode === "plan" && draft && !applyPlan.data ? (
        <AIProjectPlan
          error={applyPlan.error}
          existingProjectId={draft.projectId}
          existingProjectName={draft.projectName}
          idempotencyKey={draft.idempotencyKey}
          initialReviewValues={draft.reviewValues}
          key={draft.idempotencyKey}
          currentUserId={currentUserId}
          isPending={applyPlan.isPending}
          isMembersLoading={assignableMembersQuery.isPending}
          members={assignableMembersQuery.data?.items ?? []}
          membersError={assignableMembersQuery.error}
          onApply={handleApply}
          onCancel={handleCancelPlan}
          onRetryMembers={() => {
            void assignableMembersQuery.refetch();
          }}
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
      !generatePlan.isPending &&
      workspaceState.workspaces.length > 0 ? (
        <Card className="bg-surface-sunken/40 border-dashed shadow-none">
          <CardContent className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
            <AIDraftIllustration />
            <h2 className="mt-6 font-semibold">
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
