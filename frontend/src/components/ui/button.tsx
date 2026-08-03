import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium shadow-xs transition-[color,background-color,border-color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 hover:shadow-md",
        outline:
          "border-input bg-background hover:bg-accent hover:text-accent-foreground border hover:border-ring/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "shadow-none hover:bg-accent hover:text-accent-foreground",
        link: "text-primary shadow-none underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    isLoading?: boolean;
    loadingLabel?: string;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      className,
      disabled,
      isLoading = false,
      loadingLabel,
      variant,
      size,
      ...props
    },
    ref,
  ) {
    return (
      <button
        aria-busy={isLoading || undefined}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled === true || isLoading}
        ref={ref}
        {...props}
      >
        {isLoading ? (
          <Spinner {...(loadingLabel ? { label: loadingLabel } : {})} />
        ) : null}
        {children}
      </button>
    );
  },
);
