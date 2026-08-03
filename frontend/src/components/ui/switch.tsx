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
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent shadow-inner transition-[background-color,box-shadow] hover:shadow-md",
        checked ? "bg-primary" : "bg-input",
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
          "pointer-events-none block size-5 rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}
