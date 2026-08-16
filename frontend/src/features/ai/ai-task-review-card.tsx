import type { FieldError, UseFormRegister } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AIPlanReviewValues } from "@/features/ai/schemas";
import {
  taskPriorityLabels,
  taskStatusLabels,
} from "@/features/tasks/task-presentation";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/types/task";

type AITaskReviewCardProps = {
  index: number;
  register: UseFormRegister<AIPlanReviewValues>;
  selected: boolean;
  sourceOrder: number;
  titleError: FieldError | undefined;
  dependencies: number[];
};

export function AITaskReviewCard({
  dependencies,
  index,
  register,
  selected,
  sourceOrder,
  titleError,
}: AITaskReviewCardProps) {
  const taskKey = String(sourceOrder);
  const fieldPath = <Field extends keyof AIPlanReviewValues["tasks"][number]>(
    field: Field,
  ): `tasks.${number}.${Field}` =>
    `tasks.${String(index)}.${field}` as `tasks.${number}.${Field}`;
  const titleId = `ai-review-task-${taskKey}-title`;
  return (
    <li
      className={`rounded-xl border p-4 transition-opacity ${
        selected ? "bg-background" : "bg-muted/30 opacity-65"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          aria-label={`Inclure la tâche ${taskKey}`}
          className="accent-primary mt-1 size-4 shrink-0 cursor-pointer"
          type="checkbox"
          {...register(fieldPath("selected"))}
        />
        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={titleId}>
              <span className="text-muted-foreground mr-2">
                {String(sourceOrder).padStart(2, "0")}
              </span>
              Titre
            </label>
            <Input
              aria-invalid={Boolean(titleError)}
              disabled={!selected}
              id={titleId}
              {...register(fieldPath("title"))}
            />
            {titleError ? (
              <p className="text-destructive text-sm">{titleError.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor={`ai-review-task-${taskKey}-description`}
            >
              Description
            </label>
            <Textarea
              disabled={!selected}
              id={`ai-review-task-${taskKey}-description`}
              rows={3}
              {...register(fieldPath("description"))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor={`ai-review-task-${taskKey}-priority`}
              >
                Priorité
              </label>
              <Select
                disabled={!selected}
                id={`ai-review-task-${taskKey}-priority`}
                {...register(fieldPath("priority"))}
              >
                {TASK_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {taskPriorityLabels[priority]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor={`ai-review-task-${taskKey}-status`}
              >
                Statut initial
              </label>
              <Select
                disabled={!selected}
                id={`ai-review-task-${taskKey}-status`}
                {...register(fieldPath("status"))}
              >
                {TASK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {taskStatusLabels[status]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor={`ai-review-task-${taskKey}-date`}
              >
                Échéance
              </label>
              <Input
                disabled={!selected}
                id={`ai-review-task-${taskKey}-date`}
                type="date"
                {...register(fieldPath("dueDate"))}
              />
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor={`ai-review-task-${taskKey}-milestone`}
              >
                Phase
              </label>
              <Input
                disabled={!selected}
                id={`ai-review-task-${taskKey}-milestone`}
                {...register(fieldPath("milestone"))}
              />
            </div>
          </div>

          {dependencies.length > 0 ? (
            <p className="text-muted-foreground text-xs">
              Dépendance consultative : {dependencies.join(", ")}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}
