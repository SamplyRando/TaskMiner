import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ReactElement, ReactNode } from "react";

type TooltipProps = {
  children: ReactElement;
  content: ReactNode;
};

export function Tooltip({ children, content }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={250} skipDelayDuration={100}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            avoidCollisions
            className="tooltip-content bg-tooltip text-tooltip-foreground shadow-floating z-[100] w-max max-w-64 rounded-sm px-2 py-1 text-xs leading-4 font-medium"
            collisionPadding={12}
            side="top"
            sideOffset={6}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-tooltip" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
