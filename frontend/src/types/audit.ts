import type { ActivityEvent, ActivityResource } from "@/types/activity";

export type AuditLog = {
  id: string;
  event: ActivityEvent;
  resource: ActivityResource;
  resource_id: string;
  actor_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AuditFeed = {
  items: AuditLog[];
  count: number;
};

export type AuditListParams = {
  offset: number;
  limit: number;
  event_type?: ActivityEvent;
  resource_type?: ActivityResource;
};
