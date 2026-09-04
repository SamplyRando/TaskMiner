import { CalendarDays, ChevronDown, Link2, UserRound } from "lucide-react";
import type { FieldError, UseFormRegister } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AIPlanReviewValues } from "@/features/ai/schemas";
import {
  taskPriorityLabels,
  taskStatusLabels,
} from "@/features/tasks/task-presentation";
import { WorkspaceMemberCombobox } from "@/features/workspaces/workspace-member-combobox";
import { getMemberPrimaryLabel } from "@/features/workspaces/workspace-member-utils";
import { cn } from "@/lib/utils";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/types/task";
import type { AssignableWorkspaceMember } from "@/types/workspace";

export type AITaskDependency = {
  order: number;
  selected: boolean;
  title: string;
};

type AITaskReviewCardProps = {
  assignedUserId: string | null;
  currentUserId: string;
  dependencies: AITaskDependency[];
  dueDate: string;
  expanded: boolean;
  index: number;
  isMembersLoading: boolean;
  members: AssignableWorkspaceMember[];
  membersError: unknown;
  milestone: string;
  onAssigneeChange: (userId: string | null) => void;
  onRetryMembers: () => void;
  onToggle: () => void;
  priority: AIPlanReviewValues["tasks"][number]["priority"];
  register: UseFormRegister<AIPlanReviewValues>;
  selected: boolean;
  sourceOrder: number;
  status: AIPlanReviewValues["tasks"][number]["status"];
  title: string;
  titleError: FieldError | undefined;
};

const formatCompactDate = (value: string): string => {
  if (!value) return "Date à confirmer";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
};

export function AITaskReviewCard({
  assignedUserId,
  currentUserId,
  dependencies,
  dueDate,
  expanded,
  index,
  isMembersLoading,
  members,
  membersError,
  milestone,
  onAssigneeChange,
  onRetryMembers,
  onToggle,
  priority,
  register,
  selected,
  sourceOrder,
  status,
  title,
  titleError,
}: AITaskReviewCardProps) {
  const taskKey = String(sourceOrder);
  const fieldPath = <Field extends keyof AIPlanReviewValues["tasks"][number]>(
    field: Field,
  ): `tasks.${number}.${Field}` =>
    `tasks.${String(index)}.${field}` as `tasks.${number}.${Field}`;
  const titleId = `ai-review-task-${taskKey}-title`;
  const detailsId = `ai-review-task-${taskKey}-details`;
  const assignedMember = members.find(
    (member) => member.user_id === assignedUserId,
  );

  return (
    <li
      className={cn(
        "overflow-hidden rounded-xl border transition-[border-color,background-color,opacity]",
        selected
          ? "bg-background hover:border-primary/30"
          : "bg-muted/30 opacity-65",
      )}
      id={`ai-review-task-${taskKey}`}
    >
      <div className="flex min-w-0 items-start gap-3 p-4">
        <input
          aria-label={`Inclure la tâche ${taskKey}`}
          className="accent-primary mt-1 size-4 shrink-0 cursor-pointer"
          type="checkbox"
          {...register(fieldPath("selected"))}
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-start gap-2">
                <span className="text-primary mt-0.5 text-xs font-semibold">
                  {taskKey.padStart(2, "0")}
                </span>
                <h3 className="min-w-0 text-sm leading-5 font-semibold break-words">
                  {title || "Tâche sans titre"}
                </h3>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">{taskPriorityLabels[priority]}</Badge>
                <Badge variant="secondary">{taskStatusLabels[status]}</Badge>
                {milestone ? (
                  <Badge variant="outline">{milestone}</Badge>
                ) : null}
              </div>
            </div>
            <Button
              aria-controls={detailsId}
              aria-expanded={expanded}
              aria-label={`${expanded ? "Réduire" : "Modifier"} la tâche ${taskKey.padStart(2, "0")}`}
              onClick={onToggle}
              size="sm"
              type="button"
              variant="ghost"
            >
              {expanded ? "Réduire" : "Modifier"}
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "size-4 transition-transform motion-reduce:transition-none",
                  expanded && "rotate-180",
                )}
              />
            </Button>
          </div>

          <div className="text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <span className="flex items-center gap-1.5">
              <CalendarDays aria-hidden="true" className="size-3.5" />
              {formatCompactDate(dueDate)}
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <UserRound aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="truncate">
                {assignedMember
                  ? getMemberPrimaryLabel(assignedMember)
                  : assignedUserId
                    ? "Membre indisponible"
                    : "Non assignée"}
              </span>
            </span>
          </div>

          {dependencies.length > 0 ? (
            <div className="mt-3 flex min-w-0 items-start gap-2 text-xs">
              <Link2
                aria-hidden="true"
                className="text-primary mt-0.5 size-3.5 shrink-0"
              />
              <div className="min-w-0">
                <span className="font-medium">Dépend de</span>
                <ul className="text-muted-foreground mt-1 flex flex-wrap gap-1.5">
                  {dependencies.map((dependency) => (
                    <li
                      className={cn(
                        "rounded-md border px-2 py-1",
                        !dependency.selected &&
                          "border-amber-500/30 bg-amber-500/5 text-amber-700 line-through dark:text-amber-300",
                      )}
                      key={dependency.order}
                    >
                      {dependency.title}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <div
          className="bg-muted/15 space-y-5 border-t p-4 sm:p-5"
          id={detailsId}
        >
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={titleId}>
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
                {TASK_PRIORITIES.map((taskPriority) => (
                  <option key={taskPriority} value={taskPriority}>
                    {taskPriorityLabels[taskPriority]}
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
                {TASK_STATUSES.map((taskStatus) => (
                  <option key={taskStatus} value={taskStatus}>
                    {taskStatusLabels[taskStatus]}
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

          <WorkspaceMemberCombobox
            currentUserId={currentUserId}
            disabled={!selected}
            error={membersError}
            id={`ai-review-task-${taskKey}-assignee`}
            isLoading={isMembersLoading}
            label="Assignation suggérée"
            members={members}
            onRetry={onRetryMembers}
            onValueChange={onAssigneeChange}
            selfAssignLabel="M’assigner cette tâche"
            value={assignedUserId}
          />
        </div>
      ) : null}
    </li>
  );
}
