import type { ActivityEvent, ActivityResource } from "@/types/activity";

export type AuditActor = {
  id: string;
  email: string;
  full_name: string;
};

export type AuditLog = {
  id: string;
  workspace_id: string;
  workspace_name: string;
  actor: AuditActor | null;
  event: ActivityEvent;
  resource: ActivityResource;
  resource_id: string;
  actor_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  message: string;
  success: boolean;
  created_at: string;
};

export type AuditFeed = {
  items: AuditLog[];
  count: number;
};

export type AuditListParams = {
  offset: number;
  limit: number;
  actor_id?: string;
  event_type?: ActivityEvent;
  resource_type?: ActivityResource;
  period?: AuditPeriod;
  success?: boolean;
  search?: string;
};

export type AuditPeriod = "today" | "week" | "month";

export type AuditFilters = Omit<AuditListParams, "offset" | "limit">;

export type AuditStreamStatus = "idle" | "connecting" | "live" | "reconnecting";
