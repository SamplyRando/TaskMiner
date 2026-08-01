import { apiClient } from "@/api/client";
import { ApiError } from "@/api/client";
import type {
  ActivityFeed,
  ActivityItem,
  ActivityListParams,
} from "@/types/activity";

export const listWorkspaceActivities = async (
  workspaceId: string,
  params: ActivityListParams,
): Promise<ActivityFeed> => {
  const response = await apiClient.get<ActivityFeed>(
    `/workspaces/${workspaceId}/activities`,
    { params },
  );
  return response.data;
};

type ActivityStreamOptions = {
  accessToken: string;
  lastEventId: string | null;
  onActivity: (activity: ActivityItem) => void;
  onHeartbeat: () => void;
  onOpen: () => void;
  signal: AbortSignal;
  workspaceId: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const activityEvents = new Set([
  "workspace_created",
  "workspace_updated",
  "project_created",
  "project_updated",
  "project_deleted",
  "task_created",
  "task_updated",
  "task_deleted",
  "task_assigned",
  "comment_created",
  "attachment_uploaded",
  "invitation_created",
  "invitation_accepted",
  "member_role_updated",
]);
const activityResources = new Set([
  "workspace",
  "project",
  "task",
  "comment",
  "attachment",
  "invitation",
  "member",
]);

const isActivityActor = (value: unknown): boolean =>
  value === null ||
  (isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.email === "string" &&
    typeof value.full_name === "string");

const isActivityItem = (value: unknown): value is ActivityItem =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.created_at === "string" &&
  typeof value.type === "string" &&
  activityEvents.has(value.type) &&
  typeof value.event === "string" &&
  value.event === value.type &&
  typeof value.entity === "string" &&
  activityResources.has(value.entity) &&
  typeof value.resource === "string" &&
  value.resource === value.entity &&
  typeof value.entity_id === "string" &&
  typeof value.workspace_id === "string" &&
  typeof value.message === "string" &&
  (value.actor_id === null || typeof value.actor_id === "string") &&
  isActivityActor(value.actor) &&
  isRecord(value.metadata);

type ParsedSseEvent = {
  data: string;
  event: string;
  id: string | null;
};

const parseSseBlock = (block: string): ParsedSseEvent | null => {
  let event = "message";
  let id: string | null = null;
  const data: string[] = [];

  for (const line of block.split("\n")) {
    if (!line || line.startsWith(":")) {
      continue;
    }
    const separator = line.indexOf(":");
    const field = separator === -1 ? line : line.slice(0, separator);
    const rawValue = separator === -1 ? "" : line.slice(separator + 1);
    const value = rawValue.startsWith(" ") ? rawValue.slice(1) : rawValue;
    if (field === "event") {
      event = value;
    } else if (field === "id") {
      id = value;
    } else if (field === "data") {
      data.push(value);
    }
  }

  return data.length > 0 ? { data: data.join("\n"), event, id } : null;
};

const handleSseBlock = (
  block: string,
  options: ActivityStreamOptions,
): void => {
  const parsed = parseSseBlock(block);
  if (!parsed) {
    return;
  }
  if (parsed.event === "heartbeat") {
    options.onHeartbeat();
    return;
  }
  if (parsed.event !== "activity") {
    return;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(parsed.data);
  } catch {
    throw new ApiError("Le flux d’activité a envoyé un JSON invalide.");
  }
  if (!isActivityItem(payload) || (parsed.id && payload.id !== parsed.id)) {
    throw new ApiError("Le flux d’activité a envoyé un événement invalide.");
  }
  options.onActivity(payload);
};

export const connectActivityStream = async (
  options: ActivityStreamOptions,
): Promise<void> => {
  const baseUrl = (apiClient.defaults.baseURL ?? "/api/v1").replace(/\/$/, "");
  const headers = new Headers({
    Accept: "text/event-stream",
    Authorization: `Bearer ${options.accessToken}`,
  });
  if (options.lastEventId) {
    headers.set("Last-Event-ID", options.lastEventId);
  }

  const response = await fetch(
    `${baseUrl}/activities/stream?workspace_id=${encodeURIComponent(options.workspaceId)}`,
    { headers, signal: options.signal },
  );
  if (!response.ok) {
    throw new ApiError(
      "Impossible d’ouvrir le flux d’activité.",
      response.status,
    );
  }
  if (!response.body) {
    throw new ApiError("Le flux d’activité est indisponible.");
  }

  options.onOpen();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (!options.signal.aborted) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true }).replaceAll("\r\n", "\n");
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      handleSseBlock(buffer.slice(0, boundary), options);
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");
    }
  }

  if (!options.signal.aborted) {
    throw new ApiError("Le flux d’activité a été interrompu.");
  }
};
