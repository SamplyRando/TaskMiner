import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { JsonValueView } from "@/components/audit/json-value-view";
import { formatDateTime } from "@/lib/format";
import {
  activityEventLabels,
  activityResourceLabels,
  formatActor,
} from "@/lib/activity-presentation";
import type { AuditLog } from "@/types/audit";

type AuditDetailDialogProps = {
  log: AuditLog | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function AuditDetailDialog({
  log,
  onOpenChange,
  open,
}: AuditDetailDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        {log ? (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <DialogTitle>{activityEventLabels[log.event]}</DialogTitle>
                <Badge variant="outline">
                  {activityResourceLabels[log.resource]}
                </Badge>
              </div>
              <DialogDescription>
                {formatDateTime(log.created_at)} · {formatActor(log.actor_id)}
              </DialogDescription>
            </DialogHeader>

            <div className="bg-muted/40 rounded-lg border p-3 text-sm">
              <span className="text-muted-foreground">Ressource : </span>
              <code className="break-all">{log.resource_id}</code>
            </div>

            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <section aria-labelledby="audit-before-title" className="min-w-0">
                <h3 className="mb-2 font-semibold" id="audit-before-title">
                  Avant
                </h3>
                <div className="min-h-28 rounded-lg border border-rose-200 bg-rose-50/50 p-3">
                  <JsonValueView value={log.old_values} />
                </div>
              </section>
              <section aria-labelledby="audit-after-title" className="min-w-0">
                <h3 className="mb-2 font-semibold" id="audit-after-title">
                  Après
                </h3>
                <div className="min-h-28 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                  <JsonValueView value={log.new_values} />
                </div>
              </section>
            </div>

            <section aria-labelledby="audit-metadata-title">
              <h3 className="mb-2 font-semibold" id="audit-metadata-title">
                Métadonnées
              </h3>
              <JsonValueView value={log.metadata} />
            </section>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
