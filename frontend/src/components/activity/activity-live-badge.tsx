import { Badge } from "@/components/ui/badge";
import type { ActivityStreamStatus } from "@/types/activity";

type ActivityLiveBadgeProps = {
  status: ActivityStreamStatus;
};

export function ActivityLiveBadge({ status }: ActivityLiveBadgeProps) {
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
      aria-label={`Statut du flux : ${label}`}
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
