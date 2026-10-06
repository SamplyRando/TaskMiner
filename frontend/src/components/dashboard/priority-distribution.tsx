import { memo } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { taskPriorityTones } from "@/features/tasks/task-presentation";
import { toneBadgeClasses } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { DashboardPriorityItem } from "@/types/dashboard";
import type { TaskPriority } from "@/types/task";

const priorityConfig: Record<
  TaskPriority,
  { className: string; label: string }
> = {
  high: {
    className: toneBadgeClasses[taskPriorityTones.high],
    label: "Haute",
  },
  low: {
    className: toneBadgeClasses[taskPriorityTones.low],
    label: "Basse",
  },
  medium: {
    className: toneBadgeClasses[taskPriorityTones.medium],
    label: "Moyenne",
  },
  urgent: {
    className: toneBadgeClasses[taskPriorityTones.urgent],
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
        <CardTitle className="text-base">Priorités</CardTitle>
        <CardDescription>
          Volume des tâches par niveau d’urgence.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {items.map((item) => {
          const config = priorityConfig[item.priority];
          return (
            <div
              className="bg-surface-sunken flex min-w-0 items-center justify-between gap-2 rounded-md border px-3 py-2.5"
              key={item.priority}
            >
              <Badge
                className={cn("truncate", config.className)}
                variant="outline"
              >
                {config.label}
              </Badge>
              <span className="text-xl font-semibold tabular-nums">
                {item.count}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
});
