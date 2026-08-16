import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ListChecks,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AITaskReviewCard } from "@/features/ai/ai-task-review-card";
import {
  type AIPlanReviewValues,
  aiPlanReviewDraftSchema,
  aiPlanReviewSchema,
} from "@/features/ai/schemas";
import type {
  AIApplyProjectPlanRequest,
  AIProjectPlanResponse,
} from "@/types/ai";

type AIProjectPlanProps = {
  error: unknown;
  existingProjectId: string | null;
  existingProjectName: string | null;
  idempotencyKey: string;
  initialReviewValues: AIPlanReviewValues | null;
  isPending: boolean;
  onApply: (request: AIApplyProjectPlanRequest) => Promise<void>;
  onReviewChange: (values: AIPlanReviewValues) => void;
  plan: AIProjectPlanResponse;
  suggestedProjectName: string;
  workspaceId: string;
};

const toApplyDueDate = (value: string): string | null =>
  value ? new Date(`${value}T12:00:00Z`).toISOString() : null;

export function AIProjectPlan({
  error,
  existingProjectId,
  existingProjectName,
  idempotencyKey,
  initialReviewValues,
  isPending,
  onApply,
  onReviewChange,
  plan,
  suggestedProjectName,
  workspaceId,
}: AIProjectPlanProps) {
  const submissionLock = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationValues, setConfirmationValues] =
    useState<AIPlanReviewValues | null>(null);
  const form = useForm<AIPlanReviewValues>({
    defaultValues: initialReviewValues ?? {
      createProject: existingProjectId === null,
      projectDescription: plan.summary,
      projectName: suggestedProjectName,
      tasks: plan.tasks.map((task) => ({
        dependsOn: task.depends_on,
        description: task.description ?? "",
        dueDate: task.suggested_due_date ?? "",
        milestone: task.milestone ?? "",
        priority: task.priority,
        selected: true,
        sourceOrder: task.order,
        status: task.status,
        title: task.title,
      })),
    },
    mode: "onChange",
    resolver: zodResolver(aiPlanReviewSchema),
  });
  const reviewedTasks = useWatch({ control: form.control, name: "tasks" });
  const reviewValues = useWatch({ control: form.control });
  const reviewedProjectName = useWatch({
    control: form.control,
    name: "projectName",
  });
  const selectedTaskCount = useMemo(
    () => reviewedTasks.filter((task) => task.selected).length,
    [reviewedTasks],
  );
  const selectedTaskCountLabel = String(selectedTaskCount);
  const lastPersistedReview = useRef<string | null>(null);

  useEffect(() => {
    const parsedValues = aiPlanReviewDraftSchema.safeParse(reviewValues);
    if (!parsedValues.success) return;
    const serializedValues = JSON.stringify(parsedValues.data);
    if (serializedValues === lastPersistedReview.current) return;
    lastPersistedReview.current = serializedValues;
    onReviewChange(parsedValues.data);
  }, [onReviewChange, reviewValues]);

  const targetProjectName =
    existingProjectName ?? (reviewedProjectName.trim() || suggestedProjectName);
  const selectedTaskLabel = `${selectedTaskCountLabel} tâche${selectedTaskCount > 1 ? "s" : ""}`;
  const creationSummary = existingProjectId
    ? `${selectedTaskLabel} ${selectedTaskCount > 1 ? "seront créées" : "sera créée"} dans « ${targetProjectName} ».`
    : `Le projet « ${targetProjectName || suggestedProjectName} » et ${selectedTaskLabel} seront créés.`;

  const prepareApplication = form.handleSubmit((values) => {
    setConfirmationValues(values);
  });

  const confirmApplication = async () => {
    if (!confirmationValues || submissionLock.current) return;
    submissionLock.current = true;
    setIsSubmitting(true);
    try {
      await onApply({
        idempotency_key: idempotencyKey,
        project:
          existingProjectId === null
            ? {
                description:
                  confirmationValues.projectDescription.trim() || null,
                name: confirmationValues.projectName.trim(),
              }
            : null,
        project_id: existingProjectId,
        source_task_count: confirmationValues.tasks.length,
        tasks: confirmationValues.tasks
          .filter((task) => task.selected)
          .map((task) => ({
            assigned_user_id: null,
            depends_on: task.dependsOn.filter((dependency) =>
              confirmationValues.tasks.some(
                (candidate) =>
                  candidate.selected && candidate.sourceOrder === dependency,
              ),
            ),
            description: task.description.trim() || null,
            due_date: toApplyDueDate(task.dueDate),
            milestone: task.milestone.trim() || null,
            priority: task.priority,
            source_order: task.sourceOrder,
            status: task.status,
            title: task.title.trim(),
          })),
        workspace_id: workspaceId,
      });
      setConfirmationValues(null);
    } catch {
      submissionLock.current = false;
    } finally {
      setIsSubmitting(false);
    }
  };
  const isApplying = isPending || isSubmitting;

  return (
    <section aria-labelledby="ai-plan-title" className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>AI draft</Badge>
            <span className="text-muted-foreground text-xs">
              Brouillon IA — non enregistré
            </span>
          </div>
          <CardTitle id="ai-plan-title">Plan suggéré</CardTitle>
          <CardDescription className="max-w-3xl text-sm leading-6">
            {plan.summary}
          </CardDescription>
          <p className="text-foreground/80 max-w-3xl text-sm leading-6">
            Les modifications ci-dessous concernent uniquement le brouillon IA.
            Rien ne sera enregistré avant l’application du plan.
          </p>
        </CardHeader>
      </Card>

      <form className="space-y-6" onSubmit={prepareApplication}>
        <Card>
          <CardHeader>
            <CardTitle>Projet cible</CardTitle>
            <CardDescription>
              {existingProjectId
                ? "Les tâches seront ajoutées au projet existant, sans le recréer."
                : "Confirmez les informations du nouveau projet avant application."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {existingProjectId ? (
              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="ai-existing-project"
                >
                  Projet existant
                </label>
                <Input
                  disabled
                  id="ai-existing-project"
                  value={existingProjectName ?? "Projet sélectionné"}
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="ai-project-name"
                  >
                    Nom du projet
                  </label>
                  <Input
                    aria-invalid={Boolean(form.formState.errors.projectName)}
                    id="ai-project-name"
                    {...form.register("projectName")}
                  />
                  {form.formState.errors.projectName ? (
                    <p className="text-destructive text-sm">
                      {form.formState.errors.projectName.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="ai-project-description"
                  >
                    Description
                  </label>
                  <Textarea
                    id="ai-project-description"
                    rows={3}
                    {...form.register("projectDescription")}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.7fr)]">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ListChecks
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  <CardTitle>Tâches à appliquer</CardTitle>
                </div>
                <Badge variant="outline">
                  {selectedTaskCount} sur {reviewedTasks.length} sélectionnées
                </Badge>
              </div>
              <CardDescription>
                Les suggestions désélectionnées restent visibles mais ne seront
                pas créées.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {reviewedTasks.map((task, index) => (
                  <AITaskReviewCard
                    dependencies={task.dependsOn}
                    index={index}
                    key={task.sourceOrder}
                    register={form.register}
                    selected={task.selected}
                    sourceOrder={task.sourceOrder}
                    titleError={form.formState.errors.tasks?.[index]?.title}
                  />
                ))}
              </ol>
              {form.formState.errors.tasks?.root ? (
                <p className="text-destructive mt-3 text-sm">
                  {form.formState.errors.tasks.root.message}
                </p>
              ) : selectedTaskCount === 0 ? (
                <p className="text-destructive mt-3 text-sm">
                  Sélectionnez au moins une tâche.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CalendarDays
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  <CardTitle>Jalons suggérés</CardTitle>
                </div>
                <CardDescription>
                  Les jalons restent consultatifs dans ce sprint.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4">
                  {plan.milestones.map((milestone) => (
                    <li className="flex gap-3" key={milestone.order}>
                      <CheckCircle2
                        aria-hidden="true"
                        className="text-primary mt-0.5 size-4 shrink-0"
                      />
                      <div>
                        <p className="text-sm font-medium">{milestone.name}</p>
                        {milestone.description ? (
                          <p className="text-muted-foreground mt-1 text-xs leading-5">
                            {milestone.description}
                          </p>
                        ) : null}
                        {milestone.suggested_due_date ? (
                          <p className="text-muted-foreground mt-1 text-xs">
                            {milestone.suggested_due_date}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {plan.warnings.length > 0 ? (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      aria-hidden="true"
                      className="size-5 text-amber-600"
                    />
                    <CardTitle>À vérifier</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="text-muted-foreground list-disc space-y-2 pl-5 text-sm">
                    {plan.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>

        <FormError error={error} />
        <div className="bg-card/95 sticky bottom-4 z-20 flex flex-col items-start justify-between gap-3 rounded-xl border p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center">
          <div>
            <p aria-live="polite" className="text-sm font-medium">
              {creationSummary}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Une confirmation explicite est requise avant toute création.
            </p>
          </div>
          <Button
            disabled={
              isApplying || selectedTaskCount === 0 || !form.formState.isValid
            }
            isLoading={isApplying}
            loadingLabel="Application du plan en cours"
            type="submit"
          >
            Appliquer le plan
          </Button>
        </div>
      </form>

      <Dialog
        open={confirmationValues !== null}
        onOpenChange={(open) => {
          if (!open && !isApplying) setConfirmationValues(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer l’application du plan</DialogTitle>
            <DialogDescription>
              {existingProjectId
                ? `Vous allez ajouter ${selectedTaskCountLabel} tâche${selectedTaskCount > 1 ? "s" : ""} au projet « ${existingProjectName ?? "ce projet"} ». Cette action modifiera TaskMiner.`
                : `Vous allez créer le projet « ${confirmationValues?.projectName ?? suggestedProjectName} » et ${selectedTaskCountLabel} tâche${selectedTaskCount > 1 ? "s" : ""}. Cette action modifiera TaskMiner.`}
            </DialogDescription>
          </DialogHeader>
          <FormError error={error} />
          <DialogFooter>
            <Button
              disabled={isApplying}
              onClick={() => {
                setConfirmationValues(null);
              }}
              type="button"
              variant="outline"
            >
              Annuler
            </Button>
            <Button
              isLoading={isApplying}
              loadingLabel="Application du plan en cours"
              onClick={() => void confirmApplication()}
              type="button"
            >
              Confirmer et créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
