import type { LucideIcon } from "lucide-react";
import { memo } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  color: "blue" | "emerald" | "amber" | "violet" | "rose";
  icon: LucideIcon;
  title: string;
  value: number | string;
};

const colorClasses: Record<KpiCardProps["color"], string> = {
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-blue-100 text-blue-700",
  emerald: "bg-emerald-100 text-emerald-700",
  rose: "bg-rose-100 text-rose-700",
  violet: "bg-violet-100 text-violet-700",
};

export const KpiCard = memo(function KpiCard({
  color,
  icon: Icon,
  title,
  value,
}: KpiCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-muted-foreground truncate text-sm font-medium">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
        </div>
        <div className={cn("shrink-0 rounded-xl p-3", colorClasses[color])}>
          <Icon aria-hidden="true" className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
});
