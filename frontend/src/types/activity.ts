export type ActivityEvent =
  | "workspace_created"
  | "workspace_updated"
  | "project_created"
  | "project_updated"
  | "project_deleted"
  | "task_created"
  | "task_updated"
  | "task_deleted"
  | "task_assigned"
  | "comment_created"
  | "attachment_uploaded"
  | "invitation_created"
  | "invitation_accepted"
  | "member_role_updated";

export type ActivityResource =
  | "workspace"
  | "project"
  | "task"
  | "comment"
  | "attachment"
  | "invitation"
  | "member";

export type ActivityActor = {
  id: string;
  email: string;
  full_name: string;
};

export type ActivityItem = {
  id: string;
  actor: ActivityActor | null;
  event: ActivityEvent;
  resource: ActivityResource;
  actor_id: string | null;
  type: ActivityEvent;
  entity: ActivityResource;
  entity_id: string;
  workspace_id: string;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ActivityFeed = {
  items: ActivityItem[];
  count: number;
};

export type ActivityListParams = {
  offset: number;
  limit: number;
  actor_id?: string;
  event_type?: ActivityEvent;
  period?: ActivityPeriod;
  search?: string;
};

export type ActivityPeriod = "today" | "week" | "month";

export type ActivityFilters = Omit<ActivityListParams, "offset" | "limit">;

export type ActivityStreamStatus =
  "idle" | "connecting" | "live" | "reconnecting";
