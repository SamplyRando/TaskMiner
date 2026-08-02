import { ArrowRight, Eye, ShieldCheck, ShieldX } from "lucide-react";
import { memo, type CSSProperties } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auditActionPresentation } from "@/features/audit/presentation";
import {
  activityResourceLabels,
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
      className={cn("pb-4", isNew && "audit-arrival")}
      style={style}
    >
      <article className="bg-card h-[calc(100%-1rem)] min-w-0 rounded-xl border p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={action.className} variant="outline">
            {action.label}
          </Badge>
          <Badge variant="outline">
            {activityResourceLabels[auditLog.resource]}
          </Badge>
          <Badge
            className={
              auditLog.success
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }
            variant="outline"
          >
            <ResultIcon aria-hidden="true" className="mr-1 size-3.5" />
            {auditLog.success ? "Succès" : "Échec"}
          </Badge>
        </div>
        <h2 className="mt-3 line-clamp-2 font-semibold">{auditLog.message}</h2>
        <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span>{actor}</span>
          <span aria-hidden="true">·</span>
          <span>{auditLog.workspace_name}</span>
          <span aria-hidden="true">·</span>
          <time
            dateTime={auditLog.created_at}
            title={formatDateTime(auditLog.created_at)}
          >
            {formatRelativeDate(auditLog.created_at)}
          </time>
        </div>
        <div className="bg-muted/40 mt-3 flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <span className="text-muted-foreground shrink-0">Évolution</span>
          <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
          <span className="truncate">
            {getChangeSummary(
              auditLog.old_values,
              auditLog.new_values,
              auditLog.metadata,
            )}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <code className="text-muted-foreground truncate text-xs">
            {auditLog.resource_id}
          </code>
          <Button
            aria-label={`Voir le détail de ${auditLog.message}`}
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
