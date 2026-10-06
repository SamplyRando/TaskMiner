import { Check } from "lucide-react";

import { Facet } from "@/components/ui/facet";
import { cn } from "@/lib/utils";

const flowSteps = [
  { detail: "Vous décrivez le contexte du projet", label: "Brief" },
  {
    detail: "Tâches, priorités et jalons proposés",
    label: "Brouillon structuré",
  },
  { detail: "Vous gardez ce qui vous convient", label: "Revue humaine" },
  { detail: "Rien n’est créé avant confirmation", label: "Application" },
] as const;

type AIFlowStripProps = {
  /** Index of the step reached by the current state, or null when unknown. */
  current: number | null;
};

/**
 * Describes how TaskMiner AI works (brief → draft → review → apply). It is a
 * static legend, not a wizard: the current step only mirrors existing state
 * and nothing here is interactive or shows a fake progress value.
 */
export function AIFlowStrip({ current }: AIFlowStripProps) {
  return (
    <ol
      aria-label="Parcours TaskMiner AI"
      className="bg-border rounded-card grid gap-px overflow-hidden border sm:grid-cols-2 xl:grid-cols-4"
    >
      {flowSteps.map((step, index) => {
        const state =
          current === null
            ? "idle"
            : index < current
              ? "done"
              : index === current
                ? "current"
                : "upcoming";
        return (
          <li
            aria-current={state === "current" ? "step" : undefined}
            className={cn(
              "flex items-start gap-3 px-4 py-3",
              state === "current" ? "bg-brand-subtle" : "bg-card",
            )}
            key={step.label}
          >
            <span
              aria-hidden="true"
              className={cn(
                "text-caption mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm border tabular-nums",
                state === "current" || state === "done"
                  ? "border-brand-border bg-surface text-brand"
                  : "bg-surface-sunken text-muted-foreground",
              )}
            >
              {state === "done" ? <Check className="size-3" /> : index + 1}
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-sm font-medium",
                  state === "upcoming" && "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
              <span className="text-muted-foreground block text-xs leading-5">
                {step.detail}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Decorative CSS illustration: a raw brief (irregular lines) becoming a
 * structured draft (aligned rows), marked by the detached Facette cut.
 */
export function AIDraftIllustration() {
  return (
    <div aria-hidden="true" className="relative h-24 w-48">
      <div className="bg-surface-sunken absolute top-0 left-0 h-20 w-32 rounded-lg border p-3">
        <div className="space-y-2">
          <span className="bg-border block h-1.5 w-20 rounded-full" />
          <span className="bg-border block h-1.5 w-14 rounded-full" />
          <span className="bg-border block h-1.5 w-24 rounded-full" />
          <span className="bg-border block h-1.5 w-10 rounded-full" />
        </div>
      </div>
      <div className="bg-surface shadow-floating absolute right-0 bottom-0 h-20 w-36 rounded-lg border p-3">
        <Facet className="absolute -top-1.5 -left-1.5 size-4" />
        <div className="space-y-2.5">
          <span className="flex items-center gap-2">
            <span className="bg-brand size-1.5 rounded-full" />
            <span className="bg-brand/35 block h-1.5 w-20 rounded-full" />
          </span>
          <span className="flex items-center gap-2">
            <span className="bg-info size-1.5 rounded-full" />
            <span className="bg-border block h-1.5 w-16 rounded-full" />
          </span>
          <span className="flex items-center gap-2">
            <span className="bg-muted-foreground/50 size-1.5 rounded-full" />
            <span className="bg-border block h-1.5 w-24 rounded-full" />
          </span>
        </div>
      </div>
    </div>
  );
}
