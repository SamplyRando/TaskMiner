import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "skeleton-shimmer bg-muted relative animate-pulse overflow-hidden rounded-md",
        className,
      )}
      {...props}
    />
  );
}
