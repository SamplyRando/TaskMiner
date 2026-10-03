import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Topbar } from "@/layouts/topbar";
import {
  authenticateStore,
  fakeUser,
  resetAuthStore,
} from "@/test/auth-fixtures";
import { workspaceFixture } from "@/test/resource-fixtures";

vi.mock("@/features/notifications/notification-center", () => ({
  NotificationCenter: () => <button aria-label="Notifications" type="button" />,
}));

const renderTopbar = (topbar: React.ReactElement) =>
  render(<MemoryRouter>{topbar}</MemoryRouter>);

const defaultProps = {
  activeWorkspaceId: workspaceFixture.id,
  isWorkspacePending: false,
  onMenuClick: () => undefined,
  onWorkspaceChange: () => undefined,
  workspaces: [workspaceFixture],
};

describe("Topbar", () => {
  beforeEach(() => {
    resetAuthStore();
    authenticateStore();
  });

  it("shows the authenticated user and exposes the user menu", () => {
    renderTopbar(<Topbar {...defaultProps} />);

    expect(screen.getByText(fakeUser.full_name ?? "")).toBeInTheDocument();
    expect(screen.getByText(fakeUser.email)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ouvrir le menu utilisateur" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Notifications" }),
    ).toBeInTheDocument();
  });

  it("keeps the active workspace visible and switchable from the app shell", async () => {
    const user = userEvent.setup();
    const onWorkspaceChange = vi.fn();
    const invitedWorkspace = {
      ...workspaceFixture,
      id: "00000000-0000-4000-8000-000000000099",
      name: "Workspace invité",
    };
    renderTopbar(
      <Topbar
        {...defaultProps}
        onWorkspaceChange={onWorkspaceChange}
        workspaces={[workspaceFixture, invitedWorkspace]}
      />,
    );

    const selector = screen.getByRole("combobox", {
      name: "Workspace actif",
    });
    expect(selector).toHaveValue(workspaceFixture.id);
    await user.selectOptions(selector, invitedWorkspace.id);
    expect(onWorkspaceChange).toHaveBeenCalledWith(invitedWorkspace.id);
  });
});
