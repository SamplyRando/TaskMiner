import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { toneBadgeClasses } from "@/lib/tones";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs leading-4 font-medium transition-colors duration-150",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-transparent",
        secondary: "bg-secondary text-secondary-foreground border-transparent",
        destructive: toneBadgeClasses.danger,
        outline: "border-border-strong text-foreground",
        brand: toneBadgeClasses.brand,
        info: toneBadgeClasses.info,
        neutral: toneBadgeClasses.neutral,
        success: toneBadgeClasses.success,
        warning: toneBadgeClasses.warning,
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
