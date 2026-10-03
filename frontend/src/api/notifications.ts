import { apiClient } from "@/api/client";
import type {
  InAppNotification,
  NotificationMarkAllResult,
  NotificationPage,
  NotificationUnreadCount,
} from "@/types/notification";

export const listNotifications = async (
  offset = 0,
  limit = 20,
): Promise<NotificationPage> => {
  const response = await apiClient.get<NotificationPage>("/notifications", {
    params: { limit, offset },
  });
  return response.data;
};

export const getNotificationUnreadCount = async (): Promise<number> => {
  const response = await apiClient.get<NotificationUnreadCount>(
    "/notifications/unread-count",
  );
  return response.data.unread_count;
};

export const markNotificationRead = async (
  notificationId: string,
): Promise<InAppNotification> => {
  const response = await apiClient.patch<InAppNotification>(
    `/notifications/${notificationId}/read`,
  );
  return response.data;
};

export const markNotificationUnread = async (
  notificationId: string,
): Promise<InAppNotification> => {
  const response = await apiClient.patch<InAppNotification>(
    `/notifications/${notificationId}/unread`,
  );
  return response.data;
};

export const markAllNotificationsRead = async (): Promise<number> => {
  const response = await apiClient.patch<NotificationMarkAllResult>(
    "/notifications/read-all",
  );
  return response.data.updated_count;
};
