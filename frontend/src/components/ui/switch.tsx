import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type SwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function Switch({
  checked,
  className,
  disabled,
  onCheckedChange,
  ...props
}: SwitchProps) {
  return (
    <button
      aria-checked={checked}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-150",
        checked
          ? "bg-primary hover:bg-primary/90"
          : "bg-input hover:bg-input-hover",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      disabled={disabled}
      onClick={() => {
        onCheckedChange(!checked);
      }}
      role="switch"
      type="button"
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "ease-standard pointer-events-none block size-5 rounded-full shadow-xs transition-transform duration-150",
          checked
            ? "bg-primary-foreground translate-x-5"
            : "bg-switch-thumb translate-x-0",
        )}
      />
    </button>
  );
}
