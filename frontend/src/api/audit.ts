import { ApiError, apiClient } from "@/api/client";
import type { AuditFeed, AuditListParams, AuditLog } from "@/types/audit";

export const listWorkspaceAudit = async (
  workspaceId: string,
  params: AuditListParams,
): Promise<AuditFeed> => {
  const response = await apiClient.get<AuditFeed>(
    `/workspaces/${workspaceId}/audit`,
    { params },
  );
  return response.data;
};

type AuditStreamOptions = {
  accessToken: string;
  lastEventId: string | null;
  onAudit: (auditLog: AuditLog) => void;
  onHeartbeat: () => void;
  onOpen: () => void;
  signal: AbortSignal;
  workspaceId: string;
};

const auditEvents = new Set([
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
const auditResources = new Set([
  "workspace",
  "project",
  "task",
  "comment",
  "attachment",
  "invitation",
  "member",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isActor = (value: unknown): boolean =>
  value === null ||
  (isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.email === "string" &&
    typeof value.full_name === "string");

const isNullableRecord = (value: unknown): boolean =>
  value === null || isRecord(value);

const isAuditLog = (value: unknown): value is AuditLog =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.workspace_id === "string" &&
  typeof value.workspace_name === "string" &&
  isActor(value.actor) &&
  typeof value.event === "string" &&
  auditEvents.has(value.event) &&
  typeof value.resource === "string" &&
  auditResources.has(value.resource) &&
  typeof value.resource_id === "string" &&
  (value.actor_id === null || typeof value.actor_id === "string") &&
  isNullableRecord(value.old_values) &&
  isNullableRecord(value.new_values) &&
  isRecord(value.metadata) &&
  typeof value.message === "string" &&
  typeof value.success === "boolean" &&
  typeof value.created_at === "string";

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

const handleSseBlock = (block: string, options: AuditStreamOptions): void => {
  const parsed = parseSseBlock(block);
  if (!parsed) {
    return;
  }
  if (parsed.event === "heartbeat") {
    options.onHeartbeat();
    return;
  }
  if (parsed.event !== "audit") {
    return;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(parsed.data);
  } catch {
    throw new ApiError("Le flux d’audit a envoyé un JSON invalide.");
  }
  if (!isAuditLog(payload) || (parsed.id && payload.id !== parsed.id)) {
    throw new ApiError("Le flux d’audit a envoyé un événement invalide.");
  }
  options.onAudit(payload);
};

export const connectAuditStream = async (
  options: AuditStreamOptions,
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
    `${baseUrl}/audit/stream?workspace_id=${encodeURIComponent(options.workspaceId)}`,
    { headers, signal: options.signal },
  );
  if (!response.ok) {
    throw new ApiError("Impossible d’ouvrir le flux d’audit.", response.status);
  }
  if (!response.body) {
    throw new ApiError("Le flux d’audit est indisponible.");
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
    throw new ApiError("Le flux d’audit a été interrompu.");
  }
};
