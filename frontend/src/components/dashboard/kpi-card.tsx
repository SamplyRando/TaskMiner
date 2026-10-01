import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { memo } from "react";

import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  color: "blue" | "emerald" | "amber" | "violet" | "rose";
  icon: LucideIcon;
  title: string;
  tooltip?: string;
  value: number | string;
  variation?: number | null;
};

const colorClasses: Record<KpiCardProps["color"], string> = {
  amber: "text-amber-600 dark:text-amber-400",
  blue: "text-blue-600 dark:text-blue-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  rose: "text-rose-600 dark:text-rose-400",
  violet: "text-violet-600 dark:text-violet-400",
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
    <article className="bg-card min-w-0">
      <div className="flex min-h-36 items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-muted-foreground truncate text-sm font-medium">
              {title}
            </p>
            {tooltip ? (
              <Tooltip content={tooltip}>
                <button
                  aria-label={`Information sur ${title}`}
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring shrink-0 rounded-sm focus-visible:ring-2 focus-visible:outline-none"
                  type="button"
                >
                  <Info aria-hidden="true" className="size-3.5" />
                </button>
              </Tooltip>
            ) : null}
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
        <div className={cn("shrink-0 p-1", colorClasses[color])}>
          <Icon aria-hidden="true" className="size-5" />
        </div>
      </div>
    </article>
  );
});
