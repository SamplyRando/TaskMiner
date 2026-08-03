import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "border-input bg-background placeholder:text-muted-foreground hover:border-ring/40 aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:bg-muted/40 flex min-h-24 w-full resize-y rounded-md border px-3 py-2 text-sm shadow-xs transition-[border-color,box-shadow,background-color] disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
