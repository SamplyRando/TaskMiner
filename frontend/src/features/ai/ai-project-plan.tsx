import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ListChecks,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { taskPriorityLabels } from "@/features/tasks/task-presentation";
import type { AIProjectPlanResponse } from "@/types/ai";
import type { TaskPriority } from "@/types/task";

const priorityClassNames: Record<TaskPriority, string> = {
  high: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  low: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  medium: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  urgent: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

const formatSuggestedDate = (value: string): string =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00Z`),
  );

type AIProjectPlanProps = {
  plan: AIProjectPlanResponse;
};

export function AIProjectPlan({ plan }: AIProjectPlanProps) {
  return (
    <section aria-labelledby="ai-plan-title" className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>AI draft</Badge>
            <span className="text-muted-foreground text-xs">
              Proposition non enregistrée
            </span>
          </div>
          <CardTitle id="ai-plan-title">Plan suggéré</CardTitle>
          <CardDescription className="max-w-3xl text-sm leading-6">
            {plan.summary}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.7fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ListChecks aria-hidden="true" className="text-primary size-5" />
              <CardTitle>Tâches suggérées</CardTitle>
            </div>
            <CardDescription>
              Vérifiez chaque suggestion avant toute création dans TaskMiner.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {plan.tasks.map((task) => (
                <li
                  className="bg-background rounded-lg border p-4"
                  key={task.order}
                >
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium">
                        <span className="text-muted-foreground mr-2 text-sm">
                          {String(task.order).padStart(2, "0")}
                        </span>
                        {task.title}
                      </p>
                      {task.description ? (
                        <p className="text-muted-foreground mt-1 text-sm leading-6">
                          {task.description}
                        </p>
                      ) : null}
                    </div>
                    <Badge
                      className={priorityClassNames[task.priority]}
                      variant="outline"
                    >
                      {taskPriorityLabels[task.priority]}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
                    {task.milestone ? (
                      <span>Phase : {task.milestone}</span>
                    ) : null}
                    {task.suggested_due_date ? (
                      <span>
                        Échéance :{" "}
                        {formatSuggestedDate(task.suggested_due_date)}
                      </span>
                    ) : null}
                    {task.depends_on.length > 0 ? (
                      <span>Dépend de : {task.depends_on.join(", ")}</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
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
                          {formatSuggestedDate(milestone.suggested_due_date)}
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
    </section>
  );
}
