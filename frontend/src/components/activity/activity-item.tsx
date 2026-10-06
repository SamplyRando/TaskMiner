import {
  BriefcaseBusiness,
  CircleUserRound,
  Cog,
  FileUp,
  FolderKanban,
  MailCheck,
  MailPlus,
  MessageSquareText,
  PencilLine,
  Trash2,
  UserCog,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
import { memo, type CSSProperties } from "react";

import { Badge } from "@/components/ui/badge";
import {
  activityEventTones,
  activityResourceLabels,
  getActorInitials,
} from "@/lib/activity-presentation";
import { formatDateTime, formatRelativeDate } from "@/lib/format";
import { toneBadgeClasses } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { ActivityEvent, ActivityItem as Activity } from "@/types/activity";

const eventIcons: Record<ActivityEvent, LucideIcon> = {
  attachment_uploaded: FileUp,
  comment_created: MessageSquareText,
  invitation_accepted: MailCheck,
  invitation_created: MailPlus,
  member_role_updated: UserCog,
  project_created: FolderKanban,
  project_deleted: Trash2,
  project_updated: PencilLine,
  task_assigned: UserRoundCheck,
  task_created: BriefcaseBusiness,
  task_deleted: Trash2,
  task_updated: PencilLine,
  workspace_created: CircleUserRound,
  workspace_updated: PencilLine,
};

type ActivityItemProps = {
  activity: Activity;
  isLast: boolean;
  isNew?: boolean;
  position?: number;
  style?: CSSProperties;
  total?: number;
};

export const ActivityItem = memo(function ActivityItem({
  activity,
  isLast,
  isNew = false,
  position,
  style,
  total,
}: ActivityItemProps) {
  const Icon = eventIcons[activity.event];
  const actor = activity.actor?.full_name ?? activity.actor?.email ?? "Système";

  return (
    <li
      aria-posinset={position}
      aria-setsize={total}
      className={cn("relative", isNew && "activity-arrival")}
      style={style}
    >
      {/* Rail: links this event's node to the next one. */}
      {!isLast ? (
        <span
          aria-hidden="true"
          className="bg-border absolute top-8 bottom-1 left-3.5 w-px"
        />
      ) : null}
      {/* Each slot reads top-down: when (on the rail), then what and who. */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-md border",
            toneBadgeClasses[activityEventTones[activity.event]],
          )}
        >
          <Icon aria-hidden="true" className="size-3.5" />
        </div>
        <time
          className="text-muted-foreground text-xs tabular-nums"
          dateTime={activity.created_at}
          title={formatDateTime(activity.created_at)}
        >
          {formatRelativeDate(activity.created_at)}
        </time>
      </div>
      <article
        className={cn(
          "bg-card rounded-card mt-2 ml-10 min-w-0 border px-3.5 py-3 shadow-xs",
          isNew && "border-primary/40",
        )}
      >
        <h2 className="line-clamp-2 max-w-3xl text-sm leading-5 font-medium">
          {activity.message}
        </h2>
        <div className="text-muted-foreground mt-2 flex min-w-0 items-center gap-2 text-xs">
          <span
            aria-hidden="true"
            className="bg-surface-sunken flex size-5 shrink-0 items-center justify-center rounded-full border text-[0.625rem] font-semibold"
          >
            {activity.actor ? (
              getActorInitials(actor)
            ) : (
              <Cog className="size-3" />
            )}
          </span>
          <span className="text-foreground/80 min-w-0 truncate font-medium">
            {actor}
          </span>
          <span aria-hidden="true">·</span>
          <Badge className="shrink-0" variant="outline">
            {activityResourceLabels[activity.resource]}
          </Badge>
        </div>
      </article>
    </li>
  );
});
