import { Badge } from "@/components/ui/badge";
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
      role="status"
      variant={isLive ? "success" : "warning"}
    >
      <span
        aria-hidden="true"
        className={`mr-0.5 size-2 rounded-full ${isLive ? "bg-success" : "bg-warning"}`}
      />
      {label}
    </Badge>
  );
}
