import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, GitCompareArrows } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { ApiError } from "@/api/client";
import { FormError } from "@/components/form-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AITaskChangeReviewCard } from "@/features/ai/ai-task-change-review-card";
import {
  type AIProjectChangeReviewValues,
  aiProjectChangeReviewDraftSchema,
  aiProjectChangeReviewSchema,
} from "@/features/ai/schemas";
import type {
  AIApplyProjectChangePlanRequest,
  AIChangeField,
  AIProjectChangePlanResponse,
  AITaskChangeState,
} from "@/types/ai";

type AIProjectChangeReviewProps = {
  error: unknown;
  idempotencyKey: string;
  initialReviewValues: AIProjectChangeReviewValues | null;
  isPending: boolean;
  onApply: (request: AIApplyProjectChangePlanRequest) => Promise<void>;
  onReviewChange: (values: AIProjectChangeReviewValues) => void;
  plan: AIProjectChangePlanResponse;
  projectName: string;
  workspaceId: string;
};

const toReviewState = (
  state: AITaskChangeState,
  options: { dueDateInput: boolean },
) => ({
  title: state.title,
  description: state.description ?? "",
  status: state.status,
  priority: state.priority,
  dueDate:
    options.dueDateInput && state.due_date
      ? state.due_date.slice(0, 10)
      : (state.due_date ?? ""),
});

const toChangeReviewValues = (
  plan: AIProjectChangePlanResponse,
): AIProjectChangeReviewValues => ({
  changes: plan.changes.map((change) => ({
    selected: true,
    changeId: change.change_id,
    taskId: change.task_id,
    taskTitle: change.task_title,
    reason: change.reason,
    changedFields: change.changed_fields,
    before: toReviewState(change.before, { dueDateInput: false }),
    after: toReviewState(change.after, { dueDateInput: true }),
  })),
});

const allChangeFields: AIChangeField[] = [
  "title",
  "description",
  "status",
  "priority",
  "due_date",
];

type ReviewedChange = AIProjectChangeReviewValues["changes"][number];

const toApiState = (
  change: ReviewedChange,
  source: "before" | "after",
): AITaskChangeState => {
  const state = change[source];
  const dueDate =
    source === "before"
      ? state.dueDate || null
      : state.dueDate === change.before.dueDate.slice(0, 10)
        ? change.before.dueDate || null
        : state.dueDate
          ? new Date(`${state.dueDate}T12:00:00Z`).toISOString()
          : null;
  return {
    title: state.title.trim(),
    description: state.description.trim() || null,
    status: state.status,
    priority: state.priority,
    due_date: dueDate,
  };
};

const changedFields = (
  before: AITaskChangeState,
  after: AITaskChangeState,
): AIChangeField[] =>
  allChangeFields.filter((field) => before[field] !== after[field]);

const isConflictError = (error: unknown): boolean => {
  if (!(error instanceof ApiError) || error.status !== 409) return false;
  if (typeof error.details !== "object" || error.details === null) return false;
  const details = error.details as Record<string, unknown>;
  const detail = details.detail;
  return (
    typeof detail === "object" &&
    detail !== null &&
    (detail as Record<string, unknown>).code === "AI_CHANGE_CONFLICT"
  );
};

export function AIProjectChangeReview({
  error,
  idempotencyKey,
  initialReviewValues,
  isPending,
  onApply,
  onReviewChange,
  plan,
  projectName,
  workspaceId,
}: AIProjectChangeReviewProps) {
  const submissionLock = useRef(false);
  const lastPersistedReview = useRef<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationRequest, setConfirmationRequest] =
    useState<AIApplyProjectChangePlanRequest | null>(null);
  const form = useForm<AIProjectChangeReviewValues>({
    defaultValues: initialReviewValues ?? toChangeReviewValues(plan),
    mode: "onChange",
    resolver: zodResolver(aiProjectChangeReviewSchema),
  });
  const reviewValues = useWatch({ control: form.control });
  const reviewedChanges = useWatch({
    control: form.control,
    name: "changes",
  });
  const selectedCount = useMemo(
    () => reviewedChanges.filter((change) => change.selected).length,
    [reviewedChanges],
  );
  const selectedLabel = `${String(selectedCount)} tâche${selectedCount > 1 ? "s" : ""}`;

  useEffect(() => {
    const parsed = aiProjectChangeReviewDraftSchema.safeParse(reviewValues);
    if (!parsed.success) return;
    const serialized = JSON.stringify(parsed.data);
    if (serialized === lastPersistedReview.current) return;
    lastPersistedReview.current = serialized;
    onReviewChange(parsed.data);
  }, [onReviewChange, reviewValues]);

  const prepareApplication = form.handleSubmit((values) => {
    const approvedChanges = values.changes
      .filter((change) => change.selected)
      .map((change) => {
        const before = toApiState(change, "before");
        const after = toApiState(change, "after");
        return {
          change_id: change.changeId,
          task_id: change.taskId,
          before,
          after,
          changed_fields: changedFields(before, after),
        };
      });
    setConfirmationRequest({
      workspace_id: workspaceId,
      project_id: plan.project_id,
      source_change_count: values.changes.length,
      changes: approvedChanges,
      idempotency_key: idempotencyKey,
    });
  });

  const confirmApplication = async () => {
    if (!confirmationRequest || submissionLock.current) return;
    submissionLock.current = true;
    setIsSubmitting(true);
    try {
      await onApply(confirmationRequest);
      setConfirmationRequest(null);
    } catch {
      setConfirmationRequest(null);
      submissionLock.current = false;
    } finally {
      setIsSubmitting(false);
    }
  };
  const isApplying = isPending || isSubmitting;

  return (
    <section aria-labelledby="ai-change-review-title" className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Brouillon de modifications</Badge>
            <span className="text-muted-foreground text-xs">
              Non enregistré
            </span>
          </div>
          <CardTitle id="ai-change-review-title">{plan.summary}</CardTitle>
          <CardDescription>
            Les valeurs « Avant » viennent du serveur. Seules les modifications
            sélectionnées et confirmées seront appliquées.
          </CardDescription>
        </CardHeader>
      </Card>

      {plan.warnings.length > 0 ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex gap-3 p-4">
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-amber-600"
            />
            <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-sm">
              {plan.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {plan.changes.length > 0 ? (
        <form className="space-y-5" onSubmit={prepareApplication}>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <GitCompareArrows
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  <CardTitle>Modifications proposées</CardTitle>
                </div>
                <Badge variant="outline">
                  {selectedCount} sur {reviewedChanges.length} sélectionnées
                </Badge>
              </div>
              <CardDescription>
                Vous pouvez exclure une tâche ou ajuster chaque valeur « Après
                ».
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {reviewedChanges.map((change, index) => (
                  <AITaskChangeReviewCard
                    change={change}
                    index={index}
                    key={change.changeId}
                    register={form.register}
                  />
                ))}
              </ol>
              {form.formState.errors.changes?.root ? (
                <p className="text-destructive mt-3 text-sm">
                  {form.formState.errors.changes.root.message}
                </p>
              ) : null}
            </CardContent>
          </Card>

          {isConflictError(error) ? (
            <div
              className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-4 text-sm"
              role="alert"
            >
              Une tâche a changé depuis l’analyse. Générez un nouveau brouillon
              avant de réessayer afin de ne pas écraser le travail récent.
            </div>
          ) : (
            <FormError error={error} />
          )}

          <div className="bg-card/95 sticky bottom-4 z-20 flex flex-col items-start justify-between gap-3 rounded-xl border p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center">
            <div>
              <p aria-live="polite" className="text-sm font-medium">
                {selectedLabel}{" "}
                {selectedCount > 1 ? "seront modifiées" : "sera modifiée"} dans
                « {projectName} ».
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                L’état courant sera revérifié avant toute écriture.
              </p>
            </div>
            <Button
              disabled={
                isApplying || selectedCount === 0 || !form.formState.isValid
              }
              isLoading={isApplying}
              loadingLabel="Application des modifications en cours"
              type="submit"
            >
              Appliquer les modifications
            </Button>
          </div>
        </form>
      ) : null}

      <Dialog
        open={confirmationRequest !== null}
        onOpenChange={(open) => {
          if (!open && !isApplying) setConfirmationRequest(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer les modifications</DialogTitle>
            <DialogDescription>
              Vous allez modifier{" "}
              {String(confirmationRequest?.changes.length ?? 0)} tâche
              {(confirmationRequest?.changes.length ?? 0) > 1 ? "s" : ""} dans
              le projet « {projectName} ». Cette action modifiera TaskMiner.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={isApplying}
              onClick={() => {
                setConfirmationRequest(null);
              }}
              type="button"
              variant="outline"
            >
              Annuler
            </Button>
            <Button
              isLoading={isApplying}
              loadingLabel="Application des modifications en cours"
              onClick={() => void confirmApplication()}
              type="button"
            >
              Confirmer et modifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
