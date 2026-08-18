import { ArrowRight } from "lucide-react";
import type { UseFormRegister } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AIProjectChangeReviewValues } from "@/features/ai/schemas";
import {
  taskPriorityLabels,
  taskStatusLabels,
} from "@/features/tasks/task-presentation";
import type { AIChangeField } from "@/types/ai";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/types/task";

const fieldLabels: Record<AIChangeField, string> = {
  title: "Titre",
  description: "Description",
  status: "Statut",
  priority: "Priorité",
  due_date: "Échéance",
};

type AIChangeReview = AIProjectChangeReviewValues["changes"][number];

type AITaskChangeReviewCardProps = {
  change: AIChangeReview;
  index: number;
  register: UseFormRegister<AIProjectChangeReviewValues>;
};

export function AITaskChangeReviewCard({
  change,
  index,
  register,
}: AITaskChangeReviewCardProps) {
  const fieldPath = <
    Field extends "title" | "description" | "status" | "priority" | "dueDate",
  >(
    field: Field,
  ): `changes.${number}.after.${Field}` =>
    `changes.${String(index)}.after.${field}` as `changes.${number}.after.${Field}`;
  const taskLabel = change.taskTitle;

  const beforeValue = (field: AIChangeField): string => {
    if (field === "status") return taskStatusLabels[change.before.status];
    if (field === "priority") return taskPriorityLabels[change.before.priority];
    if (field === "due_date") return change.before.dueDate || "Aucune";
    return change.before[field] || "Aucune";
  };

  const renderAfterField = (field: AIChangeField) => {
    const id = `ai-change-${change.changeId}-${field}`;
    const label = `Nouvelle valeur ${fieldLabels[field].toLocaleLowerCase("fr")} pour ${taskLabel}`;
    if (field === "status") {
      return (
        <Select
          aria-label={label}
          disabled={!change.selected}
          id={id}
          {...register(fieldPath("status"))}
        >
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {taskStatusLabels[status]}
            </option>
          ))}
        </Select>
      );
    }
    if (field === "priority") {
      return (
        <Select
          aria-label={label}
          disabled={!change.selected}
          id={id}
          {...register(fieldPath("priority"))}
        >
          {TASK_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {taskPriorityLabels[priority]}
            </option>
          ))}
        </Select>
      );
    }
    if (field === "description") {
      return (
        <Textarea
          aria-label={label}
          disabled={!change.selected}
          id={id}
          rows={3}
          {...register(fieldPath("description"))}
        />
      );
    }
    return (
      <Input
        aria-label={label}
        disabled={!change.selected}
        id={id}
        type={field === "due_date" ? "date" : "text"}
        {...register(fieldPath(field === "due_date" ? "dueDate" : "title"))}
      />
    );
  };

  return (
    <li
      className={`rounded-xl border p-4 transition-opacity ${
        change.selected ? "bg-background" : "bg-muted/30 opacity-65"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          aria-label={`Inclure les modifications de ${taskLabel}`}
          className="accent-primary mt-1 size-4 shrink-0 cursor-pointer"
          type="checkbox"
          {...register(
            `changes.${String(index)}.selected` as `changes.${number}.selected`,
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">{taskLabel}</h3>
            <Badge variant="outline">
              {change.changedFields.length} champ
              {change.changedFields.length > 1 ? "s" : ""}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            {change.reason}
          </p>

          <div className="mt-4 space-y-4">
            {change.changedFields.map((field) => (
              <div className="rounded-lg border p-3" key={field}>
                <p className="mb-2 text-xs font-semibold tracking-wide uppercase">
                  {fieldLabels[field]}
                </p>
                <div className="grid min-w-0 items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                  <div className="bg-muted/50 min-w-0 rounded-md px-3 py-2">
                    <span className="text-muted-foreground block text-[0.68rem] font-medium uppercase">
                      Avant
                    </span>
                    <span className="mt-1 block text-sm break-words">
                      {beforeValue(field)}
                    </span>
                  </div>
                  <ArrowRight
                    aria-hidden="true"
                    className="text-primary mx-auto size-4 rotate-90 md:rotate-0"
                  />
                  <div className="min-w-0">
                    <span className="text-muted-foreground mb-1 block text-[0.68rem] font-medium uppercase">
                      Après
                    </span>
                    {renderAfterField(field)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </li>
  );
}
