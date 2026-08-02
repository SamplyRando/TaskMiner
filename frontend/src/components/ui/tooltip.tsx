import type { PropsWithChildren, ReactNode } from "react";

type TooltipProps = PropsWithChildren<{
  content: ReactNode;
}>;

export function Tooltip({ children, content }: TooltipProps) {
  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        className="bg-foreground text-background pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-max max-w-64 -translate-x-1/2 rounded-md px-2 py-1 text-xs shadow-lg group-focus-within/tooltip:block group-hover/tooltip:block"
        role="tooltip"
      >
        {content}
      </span>
    </span>
  );
}
