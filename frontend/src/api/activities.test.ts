import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  connectActivityStream,
  listWorkspaceActivities,
} from "@/api/activities";
import { apiClient } from "@/api/client";
import {
  activityFeedFixture,
  activityFixture,
  firstWorkspace,
} from "@/test/activity-fixtures";

describe("activities API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sends workspace pagination parameters to the existing endpoint", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue({ data: activityFeedFixture });
    const params = { limit: 20, offset: 40 };

    await expect(
      listWorkspaceActivities(firstWorkspace.id, params),
    ).resolves.toEqual(activityFeedFixture);
    expect(get).toHaveBeenCalledWith(
      `/workspaces/${firstWorkspace.id}/activities`,
      { params },
    );
  });

  it("opens an authenticated SSE stream and dispatches activities", async () => {
    const controller = new AbortController();
    const onActivity = vi.fn(() => {
      controller.abort();
    });
    const onHeartbeat = vi.fn();
    const onOpen = vi.fn();
    const payload = [
      `event: heartbeat\ndata: {"timestamp":"2026-08-01T10:00:00Z"}\n\n`,
      `id: ${activityFixture.id}\nevent: activity\ndata: ${JSON.stringify(activityFixture)}\n\n`,
    ].join("");
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockResolvedValue(
      new Response(payload, {
        headers: { "Content-Type": "text/event-stream" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await connectActivityStream({
      accessToken: "jwt-token",
      lastEventId: "previous-event",
      onActivity,
      onHeartbeat,
      onOpen,
      signal: controller.signal,
      workspaceId: firstWorkspace.id,
    });

    expect(onOpen).toHaveBeenCalledOnce();
    expect(onHeartbeat).toHaveBeenCalledOnce();
    expect(onActivity).toHaveBeenCalledWith(activityFixture);
    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall).toBeDefined();
    if (!firstCall) {
      throw new Error("The activity stream request was not sent.");
    }
    const [url, request] = firstCall;
    expect(url).toBe(
      `/api/v1/activities/stream?workspace_id=${firstWorkspace.id}`,
    );
    const headers = request?.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer jwt-token");
    expect(headers.get("Last-Event-ID")).toBe("previous-event");
  });

  it("rejects unavailable and malformed streams", async () => {
    const options = {
      accessToken: "jwt-token",
      lastEventId: null,
      onActivity: vi.fn(),
      onHeartbeat: vi.fn(),
      onOpen: vi.fn(),
      signal: new AbortController().signal,
      workspaceId: firstWorkspace.id,
    };
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(connectActivityStream(options)).rejects.toMatchObject({
      status: 403,
    });

    fetchMock.mockResolvedValue(
      new Response("event: activity\ndata: not-json\n\n", { status: 200 }),
    );
    await expect(connectActivityStream(options)).rejects.toThrow(
      "JSON invalide",
    );
  });
});
