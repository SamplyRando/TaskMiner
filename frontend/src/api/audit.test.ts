import { beforeEach, describe, expect, it, vi } from "vitest";

import { connectAuditStream, listWorkspaceAudit } from "@/api/audit";
import { apiClient } from "@/api/client";
import {
  auditFeedFixture,
  auditLogFixture,
  firstWorkspace,
} from "@/test/activity-fixtures";

describe("audit API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("combines audit filters with server pagination", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue({ data: auditFeedFixture });
    const params = {
      actor_id: "00000000-0000-4000-8000-000000000001",
      event_type: "task_updated" as const,
      limit: 50,
      offset: 100,
      period: "week" as const,
      resource_type: "task" as const,
      search: "roadmap",
      success: true,
    };

    await expect(
      listWorkspaceAudit(firstWorkspace.id, params),
    ).resolves.toEqual(auditFeedFixture);
    expect(get).toHaveBeenCalledWith(`/workspaces/${firstWorkspace.id}/audit`, {
      params,
    });
  });

  it("opens an authenticated SSE stream and dispatches audit entries", async () => {
    const controller = new AbortController();
    const onAudit = vi.fn(() => {
      controller.abort();
    });
    const onHeartbeat = vi.fn();
    const onOpen = vi.fn();
    const payload = [
      `event: heartbeat\ndata: {"timestamp":"2026-08-02T10:00:00Z"}\n\n`,
      `id: ${auditLogFixture.id}\nevent: audit\ndata: ${JSON.stringify(auditLogFixture)}\n\n`,
    ].join("");
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockResolvedValue(
      new Response(payload, {
        headers: { "Content-Type": "text/event-stream" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await connectAuditStream({
      accessToken: "jwt-token",
      lastEventId: "previous-audit",
      onAudit,
      onHeartbeat,
      onOpen,
      signal: controller.signal,
      workspaceId: firstWorkspace.id,
    });

    expect(onOpen).toHaveBeenCalledOnce();
    expect(onHeartbeat).toHaveBeenCalledOnce();
    expect(onAudit).toHaveBeenCalledWith(auditLogFixture);
    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall).toBeDefined();
    if (!firstCall) {
      throw new Error("The audit stream request was not sent.");
    }
    const [url, request] = firstCall;
    expect(url).toBe(`/api/v1/audit/stream?workspace_id=${firstWorkspace.id}`);
    const headers = request?.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer jwt-token");
    expect(headers.get("Last-Event-ID")).toBe("previous-audit");
  });

  it("rejects forbidden and malformed streams", async () => {
    const options = {
      accessToken: "jwt-token",
      lastEventId: null,
      onAudit: vi.fn(),
      onHeartbeat: vi.fn(),
      onOpen: vi.fn(),
      signal: new AbortController().signal,
      workspaceId: firstWorkspace.id,
    };
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(connectAuditStream(options)).rejects.toMatchObject({
      status: 403,
    });

    fetchMock.mockResolvedValue(
      new Response("event: audit\ndata: not-json\n\n", { status: 200 }),
    );
    await expect(connectAuditStream(options)).rejects.toThrow("JSON invalide");
  });
});
