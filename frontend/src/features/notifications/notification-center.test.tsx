import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getNotificationUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/api/notifications";
import { NotificationCenter } from "@/features/notifications/notification-center";
import { renderWithQuery } from "@/test/query-wrapper";
import { taskId, workspaceId } from "@/test/resource-fixtures";
import type { InAppNotification, NotificationPage } from "@/types/notification";

vi.mock("@/api/notifications", () => ({
  getNotificationUnreadCount: vi.fn(),
  listNotifications: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
  markNotificationUnread: vi.fn(),
}));

const mockedCount = vi.mocked(getNotificationUnreadCount);
const mockedList = vi.mocked(listNotifications);
const mockedMarkAll = vi.mocked(markAllNotificationsRead);
const mockedMarkRead = vi.mocked(markNotificationRead);
const notification: InAppNotification = {
  actor_user_id: "user-actor",
  created_at: new Date().toISOString(),
  entity_id: taskId,
  entity_type: "task",
  id: "notification-1",
  message: "Ada vous a assigné la tâche « Préparer la démo ».",
  read_at: null,
  title: "Nouvelle tâche assignée",
  type: "task_assigned",
  workspace_id: workspaceId,
};
const page: NotificationPage = {
  items: [notification],
  limit: 20,
  offset: 0,
  total: 1,
};

const renderCenter = (onWorkspaceChange = vi.fn()) =>
  renderWithQuery(
    <MemoryRouter>
      <NotificationCenter onWorkspaceChange={onWorkspaceChange} />
    </MemoryRouter>,
  );

describe("NotificationCenter", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedCount.mockResolvedValue(1);
    mockedList.mockResolvedValue(page);
    mockedMarkRead.mockResolvedValue({
      ...notification,
      read_at: new Date().toISOString(),
    });
    mockedMarkAll.mockResolvedValue(1);
  });

  it("renders an accessible bell, unread badge and newest notification list", async () => {
    const user = userEvent.setup();
    renderCenter();

    const bell = await screen.findByRole("button", {
      name: "Notifications, 1 non lue",
    });
    expect(screen.getByText("1")).toBeInTheDocument();
    await user.click(bell);

    expect(
      await screen.findByText("Nouvelle tâche assignée"),
    ).toBeInTheDocument();
    expect(screen.getByText(notification.message)).toBeInTheDocument();
    expect(screen.getByText("Non lue")).toHaveClass("sr-only");
    expect(screen.getByRole("menu")).toHaveClass(
      "w-[min(24rem,calc(100vw-2rem))]",
    );
  });

  it("marks an unread task notification read and selects its workspace", async () => {
    const user = userEvent.setup();
    const onWorkspaceChange = vi.fn();
    renderCenter(onWorkspaceChange);

    await user.click(
      await screen.findByRole("button", {
        name: "Notifications, 1 non lue",
      }),
    );
    await user.click(await screen.findByText("Nouvelle tâche assignée"));

    expect(mockedMarkRead.mock.calls[0]?.[0]).toBe(notification.id);
    expect(onWorkspaceChange).toHaveBeenCalledWith(workspaceId);
  });

  it("marks all unread notifications read without closing the menu", async () => {
    const user = userEvent.setup();
    renderCenter();

    await user.click(
      await screen.findByRole("button", {
        name: "Notifications, 1 non lue",
      }),
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "Tout marquer comme lu" }),
    );

    expect(mockedMarkAll).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Nouvelle tâche assignée")).toBeInTheDocument();
  });

  it("shows a useful empty state", async () => {
    const user = userEvent.setup();
    mockedCount.mockResolvedValue(0);
    mockedList.mockResolvedValue({ ...page, items: [], total: 0 });
    renderCenter();

    await user.click(
      await screen.findByRole("button", { name: "Notifications" }),
    );

    expect(
      await screen.findByText("Aucune notification pour le moment."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Tout marquer comme lu" }),
    ).toBeNull();
  });

  it("shows loading then an error with a retry action", async () => {
    const user = userEvent.setup();
    let rejectList: ((reason?: unknown) => void) | undefined;
    mockedList.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectList = reject;
      }),
    );
    renderCenter();

    await user.click(
      await screen.findByRole("button", {
        name: "Notifications, 1 non lue",
      }),
    );
    expect(
      screen.getByText("Chargement des notifications…"),
    ).toBeInTheDocument();
    rejectList?.(new Error("network"));

    expect(
      await screen.findByText("Impossible de charger les notifications."),
    ).toBeInTheDocument();
    mockedList.mockResolvedValue(page);
    await user.click(screen.getByRole("menuitem", { name: "Réessayer" }));
    await waitFor(() => {
      expect(mockedList).toHaveBeenCalledTimes(2);
    });
  });

  it("opens from the keyboard", async () => {
    const user = userEvent.setup();
    renderCenter();

    const bell = await screen.findByRole("button", {
      name: "Notifications, 1 non lue",
    });
    bell.focus();
    await user.keyboard("{Enter}");

    expect(
      await screen.findByText("Nouvelle tâche assignée"),
    ).toBeInTheDocument();
  });
});
