import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "border-input bg-background placeholder:text-muted-foreground hover:border-ring/40 aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:bg-muted/40 flex h-10 w-full rounded-md border px-3 py-2 text-sm shadow-xs transition-[border-color,box-shadow,background-color] disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      type={type}
      {...props}
    />
  );
}
