import { Activity } from "lucide-react";
import { memo } from "react";

import { ActivityItem } from "@/components/activity/activity-item";
import { EmptyState } from "@/components/empty-state";
import type { ActivityItem as ActivityRecord } from "@/types/activity";

type ActivityTimelineProps = {
  items: ActivityRecord[];
};

export const ActivityTimeline = memo(function ActivityTimeline({
  items,
}: ActivityTimelineProps) {
  if (items.length === 0) {
    return (
      <div className="bg-card rounded-xl border">
        <EmptyState
          description="Les prochains événements de ce workspace apparaîtront ici."
          icon={Activity}
          title="Aucune activité"
        />
      </div>
    );
  }

  return (
    <ol aria-label="Historique des activités" className="mx-auto max-w-4xl">
      {items.map((activity, index) => (
        <ActivityItem
          activity={activity}
          isLast={index === items.length - 1}
          key={activity.id}
        />
      ))}
    </ol>
  );
});
