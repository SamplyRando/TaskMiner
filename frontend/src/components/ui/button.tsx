import { forwardRef, type ButtonHTMLAttributes } from "react";

import {
  buttonVariants,
  type ButtonVariantProps,
} from "@/components/ui/button-variants";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonVariantProps & {
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
