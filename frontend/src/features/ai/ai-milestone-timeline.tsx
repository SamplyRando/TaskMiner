import { CalendarDays, Flag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { AIPlanReviewValues } from "@/features/ai/schemas";
import type { AIGeneratedMilestone } from "@/types/ai";

type AIMilestoneTimelineProps = {
  milestones: AIGeneratedMilestone[];
  tasks: AIPlanReviewValues["tasks"];
};

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00Z`));

export function AIMilestoneTimeline({
  milestones,
  tasks,
}: AIMilestoneTimelineProps) {
  if (milestones.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Aucun jalon n’a été proposé pour ce brouillon.
      </p>
    );
  }

  return (
    <ol className="relative space-y-0">
      {milestones.map((milestone, index) => {
        const taskCount = tasks.filter(
          (task) =>
            task.selected && task.milestone.trim() === milestone.name.trim(),
        ).length;
        return (
          <li
            className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 pb-6 last:pb-0"
            key={`${String(milestone.order)}-${milestone.name}`}
          >
            {index < milestones.length - 1 ? (
              <span
                aria-hidden="true"
                className="bg-border absolute top-10 bottom-0 left-5 w-px"
              />
            ) : null}
            <span className="border-primary/30 bg-primary/10 text-primary relative z-10 flex size-10 items-center justify-center rounded-full border text-xs font-semibold">
              {String(milestone.order).padStart(2, "0")}
            </span>
            <div className="min-w-0 rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Flag
                    aria-hidden="true"
                    className="text-primary size-4 shrink-0"
                  />
                  <h3 className="truncate text-sm font-semibold">
                    {milestone.name}
                  </h3>
                </div>
                <Badge variant="outline">Suggestion IA</Badge>
              </div>
              {milestone.description ? (
                <p className="text-muted-foreground mt-2 text-xs leading-5">
                  {milestone.description}
                </p>
              ) : null}
              <div className="text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {milestone.suggested_due_date ? (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays aria-hidden="true" className="size-3.5" />
                    {formatDate(milestone.suggested_due_date)}
                  </span>
                ) : (
                  <span>Date à confirmer</span>
                )}
                <span>
                  {taskCount} tâche{taskCount > 1 ? "s" : ""} sélectionnée
                  {taskCount > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
