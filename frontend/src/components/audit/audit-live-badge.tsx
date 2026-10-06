import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AuditStreamStatus } from "@/types/audit";

type AuditLiveBadgeProps = {
  status: AuditStreamStatus;
};

export function AuditLiveBadge({ status }: AuditLiveBadgeProps) {
  const isLive = status === "live";
  const label = isLive
    ? "En direct"
    : status === "idle"
      ? "Hors ligne"
      : status === "connecting"
        ? "Connexion..."
        : "Reconnexion...";

  return (
    <Badge
      aria-label={`Statut du journal d’audit : ${label}`}
      className="h-7 gap-2 px-2.5"
      role="status"
      variant={isLive ? "success" : "warning"}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full ring-[3px]",
          isLive ? "bg-success ring-success/25" : "bg-warning ring-warning/25",
        )}
      />
      {label}
    </Badge>
  );
}
