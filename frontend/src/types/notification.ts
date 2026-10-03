export type NotificationType = "task_assigned" | "task_commented";

export type NotificationEntityType = "task";

export type InAppNotification = {
  id: string;
  workspace_id: string;
  actor_user_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  entity_type: NotificationEntityType | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationPage = {
  items: InAppNotification[];
  total: number;
  offset: number;
  limit: number;
};

export type NotificationUnreadCount = {
  unread_count: number;
};

export type NotificationMarkAllResult = {
  updated_count: number;
};
