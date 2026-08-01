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
      className={
        isLive
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-amber-200 bg-amber-50 text-amber-800"
      }
      role="status"
      variant="outline"
    >
      <span
        aria-hidden="true"
        className={`mr-1.5 size-2 rounded-full ${isLive ? "animate-pulse bg-emerald-500" : "bg-amber-500"}`}
      />
      {label}
    </Badge>
  );
}
