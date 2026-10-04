import type { TextareaHTMLAttributes } from "react";

import { fieldClassName } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        fieldClassName,
        "placeholder:text-muted-foreground flex min-h-24 resize-y px-3 py-2 leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}
