import {
  BriefcaseBusiness,
  CircleUserRound,
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
import { activityResourceLabels } from "@/lib/activity-presentation";
import { formatDateTime, formatRelativeDate } from "@/lib/format";
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
      className={cn(
        "relative flex gap-4 pb-6 last:pb-0",
        isNew && "activity-arrival",
      )}
      style={style}
    >
      {!isLast ? (
        <span
          aria-hidden="true"
          className="bg-border absolute top-10 bottom-0 left-5 w-px"
        />
      ) : null}
      <div className="bg-primary/10 text-primary relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full">
        <Icon aria-hidden="true" className="size-4" />
      </div>
      <article className="bg-card min-w-0 flex-1 rounded-xl border p-4 shadow-sm">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <h2 className="font-semibold">{activity.message}</h2>
          </div>
          <Badge className="w-fit shrink-0" variant="outline">
            {activityResourceLabels[activity.resource]}
          </Badge>
        </div>
        <div className="text-muted-foreground mt-3 flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:gap-3">
          <span>{actor}</span>
          <span aria-hidden="true" className="hidden sm:inline">
            ·
          </span>
          <time
            dateTime={activity.created_at}
            title={formatDateTime(activity.created_at)}
          >
            {formatRelativeDate(activity.created_at)}
          </time>
        </div>
      </article>
    </li>
  );
});
