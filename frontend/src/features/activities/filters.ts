import type {
  ActivityFilters,
  ActivityItem,
  ActivityPeriod,
} from "@/types/activity";

const periodMilliseconds: Record<ActivityPeriod, number> = {
  today: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

export const matchesActivityFilters = (
  activity: ActivityItem,
  filters: ActivityFilters,
  workspaceName: string,
  now = Date.now(),
): boolean => {
  if (filters.actor_id && activity.actor_id !== filters.actor_id) {
    return false;
  }
  if (filters.event_type && activity.event !== filters.event_type) {
    return false;
  }
  if (
    filters.period &&
    now - new Date(activity.created_at).getTime() >
      periodMilliseconds[filters.period]
  ) {
    return false;
  }
  if (!filters.search) {
    return true;
  }

  const search = filters.search.toLocaleLowerCase("fr");
  const searchable = [
    activity.actor?.full_name,
    activity.actor?.email,
    activity.message,
    activity.event,
    activity.resource,
    workspaceName,
    JSON.stringify(activity.metadata),
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLocaleLowerCase("fr");

  return searchable.includes(search);
};
