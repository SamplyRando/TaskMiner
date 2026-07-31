import { memo } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardPriorityItem } from "@/types/dashboard";
import type { TaskPriority } from "@/types/task";

const priorityConfig: Record<
  TaskPriority,
  { className: string; label: string }
> = {
  high: {
    className: "border-orange-200 bg-orange-50 text-orange-700",
    label: "Haute",
  },
  low: {
    className: "border-slate-200 bg-slate-50 text-slate-700",
    label: "Basse",
  },
  medium: {
    className: "border-blue-200 bg-blue-50 text-blue-700",
    label: "Moyenne",
  },
  urgent: {
    className: "border-rose-200 bg-rose-50 text-rose-700",
    label: "Urgente",
  },
};

type PriorityDistributionProps = {
  items: DashboardPriorityItem[];
};

export const PriorityDistribution = memo(function PriorityDistribution({
  items,
}: PriorityDistributionProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Priorités</CardTitle>
        <CardDescription>
          Volume des tâches par niveau d’urgence.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {items.map((item) => {
          const config = priorityConfig[item.priority];
          return (
            <div
              className="bg-muted/40 flex min-w-0 items-center justify-between gap-2 rounded-lg border p-3"
              key={item.priority}
            >
              <Badge
                className={cn("truncate", config.className)}
                variant="outline"
              >
                {config.label}
              </Badge>
              <span className="text-xl font-bold tabular-nums">
                {item.count}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
});
