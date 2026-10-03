import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import {
  getNotificationUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
} from "@/api/notifications";
import type { InAppNotification } from "@/types/notification";

const notification: InAppNotification = {
  actor_user_id: "user-1",
  created_at: "2026-10-03T10:00:00Z",
  entity_id: "task-1",
  entity_type: "task",
  id: "notification-1",
  message: "Une tâche vous a été assignée.",
  read_at: null,
  title: "Nouvelle tâche assignée",
  type: "task_assigned",
  workspace_id: "workspace-1",
};

describe("notifications API", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("uses recipient-scoped notification endpoints", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValueOnce({
        data: { items: [notification], limit: 20, offset: 0, total: 1 },
      })
      .mockResolvedValueOnce({ data: { unread_count: 1 } });
    const patch = vi
      .spyOn(apiClient, "patch")
      .mockResolvedValueOnce({ data: notification })
      .mockResolvedValueOnce({ data: { ...notification, read_at: null } })
      .mockResolvedValueOnce({ data: { updated_count: 1 } });

    await expect(listNotifications()).resolves.toMatchObject({ total: 1 });
    await expect(getNotificationUnreadCount()).resolves.toBe(1);
    await expect(markNotificationRead(notification.id)).resolves.toEqual(
      notification,
    );
    await expect(
      markNotificationUnread(notification.id),
    ).resolves.toMatchObject({ read_at: null });
    await expect(markAllNotificationsRead()).resolves.toBe(1);

    expect(get).toHaveBeenNthCalledWith(1, "/notifications", {
      params: { limit: 20, offset: 0 },
    });
    expect(get).toHaveBeenNthCalledWith(2, "/notifications/unread-count");
    expect(patch).toHaveBeenNthCalledWith(
      1,
      "/notifications/notification-1/read",
    );
    expect(patch).toHaveBeenNthCalledWith(
      2,
      "/notifications/notification-1/unread",
    );
    expect(patch).toHaveBeenNthCalledWith(3, "/notifications/read-all");
  });
});
