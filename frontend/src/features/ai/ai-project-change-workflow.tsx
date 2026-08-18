import { GitCompareArrows } from "lucide-react";
import { useCallback, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { AIChangeApplySuccess } from "@/features/ai/ai-change-apply-success";
import { AIProjectChangeForm } from "@/features/ai/ai-project-change-form";
import { AIProjectChangeReview } from "@/features/ai/ai-project-change-review";
import {
  useApplyProjectChangePlan,
  useGenerateProjectChangePlan,
} from "@/features/ai/hooks";
import type {
  AIProjectChangeFormValues,
  AIProjectChangeReviewValues,
} from "@/features/ai/schemas";
import { useProjects } from "@/features/projects/hooks";
import { useSessionState } from "@/hooks/use-session-state";
import type {
  AIApplyProjectChangePlanRequest,
  AIApplyProjectChangePlanResponse,
  AIProjectChangePlanResponse,
} from "@/types/ai";
import type { Workspace } from "@/types/workspace";

type AIChangeDraft = {
  idempotencyKey: string;
  instruction: string;
  plan: AIProjectChangePlanResponse;
  projectId: string;
  projectName: string;
  reviewValues: AIProjectChangeReviewValues | null;
  workspaceId: string;
};

type AppliedChanges = {
  projectName: string;
  result: AIApplyProjectChangePlanResponse;
};

type AIProjectChangeWorkflowProps = {
  activeWorkspaceId: string | null;
  isWorkspacesPending: boolean;
  workspaces: Workspace[];
};

const CHANGE_DRAFT_STORAGE_KEY = "taskminer-ai-change-draft-v1";

export function AIProjectChangeWorkflow({
  activeWorkspaceId,
  isWorkspacesPending,
  workspaces,
}: AIProjectChangeWorkflowProps) {
  const generatePlan = useGenerateProjectChangePlan();
  const applyPlan = useApplyProjectChangePlan();
  const resetApplyPlan = applyPlan.reset;
  const [draft, setDraft] = useSessionState<AIChangeDraft | null>(
    CHANGE_DRAFT_STORAGE_KEY,
    null,
  );
  const [appliedChanges, setAppliedChanges] = useState<AppliedChanges | null>(
    null,
  );
  const [formCycle, setFormCycle] = useState(0);
  const [workspaceId, setWorkspaceId] = useState(
    draft?.workspaceId ?? activeWorkspaceId ?? "",
  );
  const projectsQuery = useProjects(
    {
      limit: 100,
      skip: 0,
      sort: "name",
      ...(workspaceId ? { workspace_id: workspaceId } : {}),
    },
    Boolean(workspaceId),
  );

  const handleWorkspaceChange = useCallback(
    (nextWorkspaceId: string) => {
      setWorkspaceId((currentWorkspaceId) => {
        if (currentWorkspaceId && currentWorkspaceId !== nextWorkspaceId) {
          setDraft(null);
          setAppliedChanges(null);
          resetApplyPlan();
        }
        return nextWorkspaceId;
      });
    },
    [resetApplyPlan, setDraft],
  );

  const handleGenerate = async (values: AIProjectChangeFormValues) => {
    try {
      const plan = await generatePlan.mutateAsync({
        workspace_id: values.workspaceId,
        project_id: values.projectId,
        instruction: values.instruction.trim(),
      });
      const project = projectsQuery.data?.items.find(
        (item) => item.id === values.projectId,
      );
      resetApplyPlan();
      setAppliedChanges(null);
      setDraft({
        idempotencyKey: crypto.randomUUID(),
        instruction: values.instruction.trim(),
        plan,
        projectId: values.projectId,
        projectName: project?.name ?? "Projet sélectionné",
        reviewValues: null,
        workspaceId: values.workspaceId,
      });
    } catch {
      // React Query exposes the generation error to the form.
    }
  };

  const handleReviewChange = useCallback(
    (values: AIProjectChangeReviewValues) => {
      setDraft((current) =>
        current ? { ...current, reviewValues: values } : null,
      );
    },
    [setDraft],
  );

  const handleApply = async (request: AIApplyProjectChangePlanRequest) => {
    const result = await applyPlan.mutateAsync(request);
    setAppliedChanges({
      projectName: draft?.projectName ?? "Projet sélectionné",
      result,
    });
    setDraft(null);
  };

  const handleNewInstruction = useCallback(() => {
    setDraft(null);
    setAppliedChanges(null);
    generatePlan.reset();
    applyPlan.reset();
    setFormCycle((cycle) => cycle + 1);
  }, [applyPlan, generatePlan, setDraft]);

  const initialValues: AIProjectChangeFormValues = {
    workspaceId: draft?.workspaceId ?? workspaceId,
    projectId: draft?.projectId ?? "",
    instruction: draft?.instruction ?? "",
  };

  return (
    <div className="space-y-6">
      <AIProjectChangeForm
        error={generatePlan.error}
        initialValues={initialValues}
        isPending={generatePlan.isPending}
        isProjectsError={projectsQuery.isError}
        isProjectsPending={projectsQuery.isPending}
        isWorkspacesPending={isWorkspacesPending}
        key={formCycle}
        onSubmit={handleGenerate}
        onWorkspaceChange={handleWorkspaceChange}
        projects={projectsQuery.data?.items ?? []}
        workspaces={workspaces}
      />

      {draft && !applyPlan.data ? (
        <AIProjectChangeReview
          error={applyPlan.error}
          idempotencyKey={draft.idempotencyKey}
          initialReviewValues={draft.reviewValues}
          isPending={applyPlan.isPending}
          onApply={handleApply}
          onReviewChange={handleReviewChange}
          plan={draft.plan}
          projectName={draft.projectName}
          workspaceId={draft.workspaceId}
        />
      ) : null}

      {appliedChanges ? (
        <AIChangeApplySuccess
          onNewInstruction={handleNewInstruction}
          projectName={appliedChanges.projectName}
          result={appliedChanges.result}
        />
      ) : null}

      {!draft && !appliedChanges ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-44 flex-col items-center justify-center px-6 py-10 text-center">
            <GitCompareArrows
              aria-hidden="true"
              className="text-muted-foreground size-9"
            />
            <h2 className="mt-4 font-semibold">Le comparatif apparaîtra ici</h2>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm">
              Sélectionnez un projet et décrivez les changements souhaités.
              TaskMiner affichera toujours les valeurs avant et après.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
