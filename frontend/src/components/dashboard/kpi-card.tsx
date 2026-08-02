import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { memo } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  color: "blue" | "emerald" | "amber" | "violet" | "rose";
  icon: LucideIcon;
  title: string;
  tooltip: string;
  value: number | string;
  variation?: number | null;
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
  tooltip,
  value,
  variation,
}: KpiCardProps) {
  const variationLabel =
    variation === null || variation === undefined
      ? "Comparaison indisponible"
      : `${variation >= 0 ? "+" : ""}${variation.toLocaleString("fr-FR")} % vs période précédente`;

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-muted-foreground truncate text-sm font-medium">
              {title}
            </p>
            <span className="group relative shrink-0" tabIndex={0}>
              <Info
                aria-label={`Information sur ${title}`}
                className="text-muted-foreground size-3.5"
              />
              <span
                className="bg-popover text-popover-foreground pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-52 -translate-x-1/2 rounded-md border p-2 text-xs shadow-md group-hover:block group-focus:block"
                role="tooltip"
              >
                {tooltip}
              </span>
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          <p
            className={cn(
              "mt-2 flex items-center gap-1 text-xs",
              variation === null || variation === undefined
                ? "text-muted-foreground"
                : variation >= 0
                  ? "text-emerald-700"
                  : "text-rose-700",
            )}
          >
            {variation !== null && variation !== undefined ? (
              variation >= 0 ? (
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              ) : (
                <ArrowDownRight aria-hidden="true" className="size-3.5" />
              )
            ) : null}
            {variationLabel}
          </p>
        </div>
        <div className={cn("shrink-0 rounded-xl p-3", colorClasses[color])}>
          <Icon aria-hidden="true" className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
});
