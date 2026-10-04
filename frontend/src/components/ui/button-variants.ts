import { cva, type VariantProps } from "class-variance-authority";

export const buttonVariants = cva(
  "rounded-control inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,scale] duration-150 select-none active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-progress",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-control hover:bg-primary/90 active:bg-primary/85",
        destructive:
          "bg-destructive text-destructive-foreground shadow-control hover:bg-destructive/90 active:bg-destructive/85",
        outline:
          "border-border-strong bg-surface text-foreground hover:border-input hover:bg-accent border shadow-xs",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-accent active:bg-accent/80",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline active:scale-100",
      },
      // Touch screens get a larger minimum target without overriding the
      // explicit heights some call sites already set (h-8, h-auto…).
      size: {
        default: "h-control pointer-coarse:min-h-control-lg px-4",
        sm: "h-control-sm pointer-coarse:min-h-control px-3",
        lg: "h-control-lg pointer-coarse:min-h-control-touch px-5",
        icon: "size-control pointer-coarse:min-h-control-lg pointer-coarse:min-w-control-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
