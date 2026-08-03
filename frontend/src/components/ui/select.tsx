import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "border-input bg-background hover:border-ring/40 aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:bg-muted/40 flex h-10 w-full cursor-pointer rounded-md border px-3 py-2 text-sm shadow-xs transition-[border-color,box-shadow,background-color] disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
