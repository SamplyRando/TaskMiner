import type { InputHTMLAttributes } from "react";

import { fieldClassName } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      className={cn(
        fieldClassName,
        "placeholder:text-muted-foreground h-control pointer-coarse:min-h-control-lg flex px-3 py-1.5 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      type={type}
      {...props}
    />
  );
}
