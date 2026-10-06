import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { memo } from "react";

import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  color: "blue" | "emerald" | "amber" | "violet" | "rose" | "neutral";
  icon: LucideIcon;
  /** primary: headline metric; compact: secondary metric strip. */
  size?: "primary" | "compact";
  title: string;
  tooltip?: string;
  value: number | string;
  variation?: number | null;
};

const colorClasses: Record<KpiCardProps["color"], string> = {
  amber: "text-warning",
  blue: "text-info",
  emerald: "text-success",
  neutral: "text-muted-foreground",
  rose: "text-destructive",
  violet: "text-brand",
};

export const KpiCard = memo(function KpiCard({
  color,
  icon: Icon,
  size = "primary",
  title,
  tooltip,
  value,
  variation,
}: KpiCardProps) {
  const isCompact = size === "compact";
  const variationLabel =
    variation === null || variation === undefined
      ? "Comparaison indisponible"
      : `${variation >= 0 ? "+" : ""}${variation.toLocaleString("fr-FR")} % vs période précédente`;

  return (
    <article
      className={cn("min-w-0", isCompact ? "bg-surface-sunken" : "bg-card")}
    >
      <div
        className={cn(
          "flex h-full flex-col",
          isCompact ? "min-h-24 gap-1 px-4 py-3.5" : "min-h-36 gap-3 p-5",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div
            className={cn(
              "flex min-w-0 gap-1.5",
              // Compact titles may wrap on two reserved lines rather than be
              // truncated, so every value of the strip stays aligned.
              isCompact ? "min-h-8 items-start" : "items-center",
            )}
          >
            {isCompact ? (
              <Icon
                aria-hidden="true"
                className={cn("mt-px size-3.5 shrink-0", colorClasses[color])}
              />
            ) : null}
            <p
              className={cn(
                "text-muted-foreground font-medium",
                isCompact
                  ? "line-clamp-2 text-xs leading-4"
                  : "truncate text-sm",
              )}
            >
              {title}
            </p>
            {tooltip ? (
              <Tooltip content={tooltip}>
                <button
                  aria-label={`Information sur ${title}`}
                  className={cn(
                    "text-muted-foreground hover:text-foreground focus-visible:ring-ring shrink-0 rounded-sm focus-visible:ring-2 focus-visible:outline-none",
                    isCompact && "mt-px",
                  )}
                  type="button"
                >
                  <Info aria-hidden="true" className="size-3.5" />
                </button>
              </Tooltip>
            ) : null}
          </div>
          {isCompact ? null : (
            <span
              className={cn(
                "bg-surface-sunken flex size-8 shrink-0 items-center justify-center rounded-md border",
                colorClasses[color],
              )}
            >
              <Icon aria-hidden="true" className="size-4" />
            </span>
          )}
        </div>
        <p
          className={cn(
            "tracking-tight tabular-nums",
            isCompact ? "text-xl font-semibold" : "text-3xl font-semibold",
          )}
        >
          {value}
        </p>
        <p
          className={cn(
            "mt-auto flex items-center gap-1 text-xs",
            variation === null || variation === undefined
              ? "text-muted-foreground"
              : variation >= 0
                ? "text-success"
                : "text-destructive",
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
    </article>
  );
});
