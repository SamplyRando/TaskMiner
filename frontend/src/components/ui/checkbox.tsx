import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

// A styled native checkbox: semantics, labels, keyboard and form behaviour stay
// those of <input type="checkbox">. The check glyph follows the theme
// (see .ui-checkbox in styles.css).
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ className, ...props }, ref) {
    return (
      <input
        className={cn(
          "ui-checkbox border-input bg-surface hover:border-input-hover checked:border-primary checked:bg-primary indeterminate:border-primary indeterminate:bg-primary aria-invalid:border-destructive size-4 shrink-0 cursor-pointer appearance-none rounded-xs border shadow-xs transition-[background-color,border-color] duration-150 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        type="checkbox"
        {...props}
      />
    );
  },
);
