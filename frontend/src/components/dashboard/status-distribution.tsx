import { memo } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DashboardStatusItem } from "@/types/dashboard";
import type { TaskStatus } from "@/types/task";

const statusConfig: Record<
  TaskStatus,
  { indicatorClassName: string; label: string }
> = {
  done: { indicatorClassName: "bg-emerald-500", label: "Terminées" },
  in_progress: { indicatorClassName: "bg-blue-500", label: "En cours" },
  todo: { indicatorClassName: "bg-slate-400", label: "En attente" },
};

type StatusDistributionProps = {
  items: DashboardStatusItem[];
};

export const StatusDistribution = memo(function StatusDistribution({
  items,
}: StatusDistributionProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Répartition par statut</CardTitle>
        <CardDescription>
          Progression globale des tâches actives.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {items.map((item) => {
          const config = statusConfig[item.status];
          return (
            <div className="space-y-2" key={item.status}>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium">{config.label}</span>
                <span className="text-muted-foreground tabular-nums">
                  {item.count} · {item.percentage.toLocaleString("fr-FR")}%
                </span>
              </div>
              <Progress
                aria-label={`${config.label} : ${String(item.percentage)} %`}
                indicatorClassName={config.indicatorClassName}
                value={item.percentage}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
});
