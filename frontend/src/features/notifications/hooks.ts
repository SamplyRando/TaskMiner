import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getNotificationUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
} from "@/api/notifications";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: () => [...notificationKeys.all, "list"] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
};

export const useNotificationUnreadCount = () =>
  useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: getNotificationUnreadCount,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 15_000,
  });

export const useNotifications = (enabled: boolean) =>
  useQuery({
    enabled,
    queryKey: notificationKeys.list(),
    queryFn: () => listNotifications(),
    refetchInterval: enabled ? 30_000 : false,
    refetchIntervalInBackground: false,
    staleTime: 15_000,
  });

const useInvalidateNotifications = () => {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: notificationKeys.all,
    });
};

export const useMarkNotificationRead = () => {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: invalidate,
  });
};

export const useMarkNotificationUnread = () => {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: markNotificationUnread,
    onSuccess: invalidate,
  });
};

export const useMarkAllNotificationsRead = () => {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidate,
  });
};
