import { ArrowRight, Cog, Eye, ShieldCheck, ShieldX } from "lucide-react";
import { memo, type CSSProperties } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auditActionPresentation } from "@/features/audit/presentation";
import {
  activityResourceLabels,
  getActorInitials,
  getChangeSummary,
} from "@/lib/activity-presentation";
import { formatDateTime, formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AuditLog } from "@/types/audit";

type AuditItemProps = {
  auditLog: AuditLog;
  isNew?: boolean;
  onView: (auditLog: AuditLog) => void;
  position?: number;
  style?: CSSProperties;
  total?: number;
};

export const AuditItem = memo(function AuditItem({
  auditLog,
  isNew = false,
  onView,
  position,
  style,
  total,
}: AuditItemProps) {
  const action = auditActionPresentation[auditLog.event];
  const actor = auditLog.actor?.full_name ?? auditLog.actor?.email ?? "Système";
  const ResultIcon = auditLog.success ? ShieldCheck : ShieldX;

  return (
    <li
      aria-posinset={position}
      aria-setsize={total}
      className={cn("pb-3", isNew && "audit-arrival")}
      style={style}
    >
      <article
        className={cn(
          "bg-card rounded-card flex h-[calc(100%-0.75rem)] min-w-0 flex-col border px-3.5 py-3 shadow-xs",
          // A failed operation keeps a Ruby edge so it stands out while scanning.
          !auditLog.success && "border-l-destructive border-l-2",
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={action.className} variant="outline">
            {action.label}
          </Badge>
          <Badge variant="outline">
            {activityResourceLabels[auditLog.resource]}
          </Badge>
          <Badge
            className="ml-auto"
            variant={auditLog.success ? "success" : "destructive"}
          >
            <ResultIcon aria-hidden="true" className="size-3.5" />
            {auditLog.success ? "Succès" : "Échec"}
          </Badge>
        </div>
        <h2 className="mt-2 line-clamp-2 text-sm leading-5 font-medium">
          {auditLog.message}
        </h2>
        <div className="text-muted-foreground mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span
              aria-hidden="true"
              className="bg-surface-sunken flex size-5 shrink-0 items-center justify-center rounded-full border text-[0.625rem] font-semibold"
            >
              {auditLog.actor ? (
                getActorInitials(actor)
              ) : (
                <Cog className="size-3" />
              )}
            </span>
            <span className="text-foreground/80 truncate font-medium">
              {actor}
            </span>
          </span>
          <span aria-hidden="true">·</span>
          <span>{auditLog.workspace_name}</span>
          <span aria-hidden="true">·</span>
          <time
            className="tabular-nums"
            dateTime={auditLog.created_at}
            title={formatDateTime(auditLog.created_at)}
          >
            {formatRelativeDate(auditLog.created_at)}
          </time>
        </div>
        <div className="bg-surface-sunken mt-2.5 flex min-w-0 items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
          <span className="text-muted-foreground shrink-0 text-xs font-medium">
            Évolution
          </span>
          <ArrowRight
            aria-hidden="true"
            className="text-muted-foreground size-3.5 shrink-0"
          />
          <span className="truncate">
            {getChangeSummary(
              auditLog.old_values,
              auditLog.new_values,
              auditLog.metadata,
            )}
          </span>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <code className="text-muted-foreground truncate font-mono text-xs">
            {auditLog.resource_id}
          </code>
          <Button
            aria-label={`Voir le détail de ${auditLog.message}`}
            className="text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => {
              onView(auditLog);
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Eye aria-hidden="true" className="size-4" />
            Détails
          </Button>
        </div>
      </article>
    </li>
  );
});
