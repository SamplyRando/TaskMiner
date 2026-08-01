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

export type ActivityItem = {
  id: string;
  event: ActivityEvent;
  resource: ActivityResource;
  actor_id: string | null;
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
};
