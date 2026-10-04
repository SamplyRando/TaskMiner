import { Bell, CheckCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useNotificationUnreadCount,
} from "@/features/notifications/hooks";
import { formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InAppNotification } from "@/types/notification";

type NotificationCenterProps = {
  onWorkspaceChange: (workspaceId: string) => void;
};

export function NotificationCenter({
  onWorkspaceChange,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const unreadCount = useNotificationUnreadCount();
  const notifications = useNotifications(open);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const count = unreadCount.data ?? 0;
  const bellLabel =
    count > 0
      ? `Notifications, ${String(count)} non lue${count > 1 ? "s" : ""}`
      : "Notifications";

  const openNotification = (notification: InAppNotification) => {
    if (notification.read_at === null) {
      markRead.mutate(notification.id);
    }
    if (notification.entity_type === "task" && notification.entity_id) {
      onWorkspaceChange(notification.workspace_id);
      void navigate("/app/tasks");
    } else if (
      notification.entity_type === "project" &&
      notification.entity_id
    ) {
      onWorkspaceChange(notification.workspace_id);
      void navigate("/app/projects");
    }
  };

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={bellLabel}
          className="relative"
          size="icon"
          type="button"
          variant="ghost"
        >
          <Bell aria-hidden="true" className="size-5" />
          {count > 0 ? (
            <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] leading-none font-bold">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(24rem,calc(100vw-2rem))] p-0"
      >
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {count > 0 ? (
            <DropdownMenuItem
              className="h-8 gap-1.5 px-2 text-xs"
              disabled={markAllRead.isPending}
              onSelect={(event) => {
                event.preventDefault();
                markAllRead.mutate();
              }}
            >
              <CheckCheck aria-hidden="true" className="size-3.5" />
              Tout marquer comme lu
            </DropdownMenuItem>
          ) : null}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-[min(28rem,70vh)] overflow-y-auto p-1">
          {notifications.isPending ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
              Chargement des notifications…
            </p>
          ) : null}
          {notifications.isError ? (
            <div className="space-y-2 px-3 py-5 text-center">
              <p className="text-destructive text-sm">
                Impossible de charger les notifications.
              </p>
              <DropdownMenuItem
                className="justify-center border"
                onSelect={(event) => {
                  event.preventDefault();
                  void notifications.refetch();
                }}
              >
                Réessayer
              </DropdownMenuItem>
            </div>
          ) : null}
          {notifications.isSuccess && notifications.data.items.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
              Aucune notification pour le moment.
            </p>
          ) : null}
          {notifications.data?.items.map((notification) => (
            <DropdownMenuItem
              className={cn(
                "relative block px-3 py-2.5",
                notification.read_at === null && "bg-primary/5",
              )}
              key={notification.id}
              onSelect={() => {
                openNotification(notification);
              }}
            >
              <span className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    notification.read_at === null
                      ? "bg-primary"
                      : "bg-transparent",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium">
                      {notification.title}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {formatRelativeDate(notification.created_at)}
                    </span>
                  </span>
                  <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                    {notification.message}
                  </span>
                  <span className="sr-only">
                    {notification.read_at === null ? "Non lue" : "Lue"}
                  </span>
                </span>
              </span>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
