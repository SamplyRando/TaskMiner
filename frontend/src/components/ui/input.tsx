import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "border-input bg-background placeholder:text-muted-foreground flex h-10 w-full rounded-md border px-3 py-2 text-sm shadow-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      type={type}
      {...props}
    />
  );
}
