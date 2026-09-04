import { AlertCircle, AlertTriangle, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AIPlanWarning } from "@/features/ai/ai-plan-warning-utils";

type AIPlanWarningsProps = {
  onOpenTask: (taskOrder: number) => void;
  warnings: AIPlanWarning[];
};

const warningStyle = {
  blocking: {
    Icon: AlertCircle,
    label: "Bloquant",
    style: "border-destructive/30 bg-destructive/5 text-destructive",
  },
  warning: {
    Icon: AlertTriangle,
    label: "À vérifier",
    style:
      "border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-200",
  },
  info: {
    Icon: Info,
    label: "Information",
    style: "border-primary/20 bg-primary/5 text-foreground",
  },
} as const;

export function AIPlanWarnings({ onOpenTask, warnings }: AIPlanWarningsProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-3">
      {warnings.map((warning) => {
        const { Icon, label, style } = warningStyle[warning.level];
        return (
          <div className={`rounded-lg border p-3 ${style}`} key={warning.id}>
            <div className="flex items-start gap-2.5">
              <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[0.68rem] font-semibold tracking-wide uppercase">
                  {label}
                </p>
                <p className="mt-1 text-xs leading-5">{warning.message}</p>
                {warning.taskOrder ? (
                  <Button
                    className="mt-1 h-auto p-0 text-xs"
                    onClick={() => {
                      onOpenTask(warning.taskOrder ?? 0);
                    }}
                    type="button"
                    variant="link"
                  >
                    Voir la tâche {String(warning.taskOrder).padStart(2, "0")}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
