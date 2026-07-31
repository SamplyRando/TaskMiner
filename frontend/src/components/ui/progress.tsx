import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ProgressProps = HTMLAttributes<HTMLDivElement> & {
  indicatorClassName?: string;
  value: number;
};

export function Progress({
  className,
  indicatorClassName,
  value,
  ...props
}: ProgressProps) {
  const boundedValue = Math.min(100, Math.max(0, value));

  return (
    <div
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={boundedValue}
      className={cn("bg-muted h-2 overflow-hidden rounded-full", className)}
      role="progressbar"
      {...props}
    >
      <div
        className={cn(
          "bg-primary h-full rounded-full transition-all",
          indicatorClassName,
        )}
        style={{ width: `${String(boundedValue)}%` }}
      />
    </div>
  );
}
