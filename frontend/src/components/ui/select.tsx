import type { SelectHTMLAttributes } from "react";

import { fieldClassName } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

// Native <select> on purpose: keyboard and mobile pickers come for free and
// the tests rely on it. Only the chevron is redrawn (see .ui-select).
export function Select({ className, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        fieldClassName,
        "ui-select h-control pointer-coarse:min-h-control-lg flex cursor-pointer appearance-none py-1.5 pr-9 pl-3",
        className,
      )}
      {...props}
    />
  );
}
