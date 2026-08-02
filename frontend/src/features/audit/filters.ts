import type { ActivityEvent, ActivityResource } from "@/types/activity";
import type { AuditFilters, AuditLog, AuditPeriod } from "@/types/audit";

export type AuditFiltersValue = {
  actorId: string;
  eventType: ActivityEvent | "";
  period: AuditPeriod | "";
  resourceType: ActivityResource | "";
  search: string;
  success: "" | "false" | "true";
};

export const emptyAuditFilters: AuditFiltersValue = {
  actorId: "",
  eventType: "",
  period: "",
  resourceType: "",
  search: "",
  success: "",
};

const periodMilliseconds: Record<AuditPeriod, number> = {
  today: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

export const matchesAuditFilters = (
  auditLog: AuditLog,
  filters: AuditFilters,
  now = Date.now(),
): boolean => {
  if (filters.actor_id && auditLog.actor_id !== filters.actor_id) {
    return false;
  }
  if (filters.event_type && auditLog.event !== filters.event_type) {
    return false;
  }
  if (filters.resource_type && auditLog.resource !== filters.resource_type) {
    return false;
  }
  if (filters.success !== undefined && auditLog.success !== filters.success) {
    return false;
  }
  if (
    filters.period &&
    now - new Date(auditLog.created_at).getTime() >
      periodMilliseconds[filters.period]
  ) {
    return false;
  }
  if (!filters.search) {
    return true;
  }

  const search = filters.search.toLocaleLowerCase("fr");
  const searchable = [
    auditLog.actor?.full_name,
    auditLog.actor?.email,
    auditLog.message,
    auditLog.event,
    auditLog.resource,
    auditLog.resource_id,
    auditLog.workspace_name,
    JSON.stringify(auditLog.old_values),
    JSON.stringify(auditLog.new_values),
    JSON.stringify(auditLog.metadata),
    auditLog.success ? "succès" : "échec",
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLocaleLowerCase("fr");

  return searchable.includes(search);
};
