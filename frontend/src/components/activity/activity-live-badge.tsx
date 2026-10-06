import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
