import { Check, Square } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Facet } from "@/components/ui/facet";
import {
  taskPriorityClasses,
  taskPriorityLabels,
} from "@/features/tasks/task-presentation";
import { cn } from "@/lib/utils";
import type { TaskPriority } from "@/types/task";

/* ------------------------------------------------------------------------ */
/* Layout and typography                                                    */
/* ------------------------------------------------------------------------ */

export const marketingContainer = "mx-auto w-full max-w-7xl px-5 sm:px-8";

/** Brand call to action: Améthyste in both themes, never the user accent. */
export const marketingPrimaryCta =
  "bg-brand text-brand-foreground hover:bg-brand/90 rounded-control inline-flex h-11 items-center justify-center gap-2 px-5 text-[0.9375rem] font-semibold whitespace-nowrap shadow-xs transition-[background-color,scale] duration-150 active:scale-[0.98]";

export const marketingSecondaryCta =
  "border-border-strong bg-surface text-foreground hover:bg-accent rounded-control inline-flex h-11 items-center justify-center gap-2 border px-5 text-[0.9375rem] font-medium whitespace-nowrap transition-[background-color,scale] duration-150 active:scale-[0.98]";

export const marketingH2 =
  "text-[1.875rem] leading-[1.12] font-semibold tracking-[-0.028em] text-balance sm:text-[2.375rem] lg:text-[2.75rem]";

type EyebrowProps = { children: ReactNode; className?: string };

export function Eyebrow({ children, className }: EyebrowProps) {
  return (
    <p
      className={cn(
        "text-brand inline-flex items-center gap-2 text-sm font-medium",
        className,
      )}
    >
      <Facet className="size-3.5" tone="current" />
      {children}
    </p>
  );
}

type SectionHeadingProps = {
  align?: "center" | "start";
  eyebrow?: string;
  id: string;
  lead?: ReactNode;
  title: ReactNode;
};

/**
 * Section header used by the in-page anchors: the marketing anchor engine
 * scrolls to and focuses `[data-marketing-anchor-target]`.
 */
export function SectionHeading({
  align = "start",
  eyebrow,
  id,
  lead,
  title,
}: SectionHeadingProps) {
  return (
    <header
      className={cn(
        "max-w-3xl outline-none",
        align === "center" && "mx-auto text-center",
      )}
      data-marketing-anchor-target
      tabIndex={-1}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className={cn(marketingH2, eyebrow && "mt-3")} id={id}>
        {title}
      </h2>
      {lead ? (
        <p className="text-muted-foreground mt-4 text-base leading-relaxed text-pretty sm:text-lg">
          {lead}
        </p>
      ) : null}
    </header>
  );
}

/* ------------------------------------------------------------------------ */
/* Product visuals                                                          */
/*                                                                          */
/* Static compositions built from the real interface language (tokens, task */
/* badges, tones): simplified, but recognisable in the product. They are    */
/* always decorative (aria-hidden) and described by visible copy nearby.    */
/* ------------------------------------------------------------------------ */

type MockPanelProps = {
  children: ReactNode;
  className?: string;
  label?: ReactNode;
  meta?: ReactNode;
};

/** A product surface: the card language of the app with a quiet header. */
export function MockPanel({
  children,
  className,
  label,
  meta,
}: MockPanelProps) {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground rounded-card border shadow-xs",
        className,
      )}
    >
      {label ? (
        <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
          <span className="text-foreground text-[0.8125rem] font-semibold">
            {label}
          </span>
          {meta ? (
            <span className="text-muted-foreground text-xs tabular-nums">
              {meta}
            </span>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function MockPriority({ priority }: { priority: TaskPriority }) {
  return (
    <Badge className={cn("shrink-0", taskPriorityClasses[priority])}>
      {taskPriorityLabels[priority]}
    </Badge>
  );
}

export function MockAvatar({
  className,
  initials,
}: {
  className?: string;
  initials: string;
}) {
  return (
    <span
      className={cn(
        "bg-surface-sunken text-muted-foreground flex size-5 shrink-0 items-center justify-center rounded-full border text-[0.625rem] font-semibold",
        className,
      )}
    >
      {initials}
    </span>
  );
}

/** The review checkbox of TaskMiner AI drafts, as a static mark. */
export function MockCheck({
  checked,
  small = false,
}: {
  checked: boolean;
  small?: boolean;
}) {
  if (!checked) {
    return (
      <Square
        className={cn(
          "text-muted-foreground shrink-0",
          small ? "size-3.5" : "size-4",
        )}
      />
    );
  }
  return (
    <span
      className={cn(
        "bg-brand text-brand-foreground flex shrink-0 items-center justify-center",
        small ? "size-3.5 rounded-[0.1875rem]" : "size-4 rounded-[0.25rem]",
      )}
    >
      <Check className={small ? "size-2.5" : "size-3"} strokeWidth={3} />
    </span>
  );
}

/** Small rail node with the Facette mark, used between transformation steps. */
export function FacetNode({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "bg-surface border-brand-border text-brand flex size-7 shrink-0 items-center justify-center rounded-md border shadow-xs",
        className,
      )}
    >
      <Facet className="size-3.5" tone="current" />
    </span>
  );
}
