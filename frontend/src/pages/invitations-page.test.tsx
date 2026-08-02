import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/api/client";
import {
  acceptInvitation,
  createWorkspaceInvitation,
  getInvitation,
  listWorkspaceInvitations,
  revokeInvitation,
} from "@/api/invitations";
import { getUserPreferences } from "@/api/settings";
import { listWorkspaces } from "@/api/workspace";
import { getWorkspacePermissions } from "@/api/workspace-permissions";
import { InvitationsPage } from "@/pages/invitations-page";
import { useWorkspaceStore } from "@/store/workspace-store";
import { authenticateStore, fakeUser } from "@/test/auth-fixtures";
import {
  acceptedWorkspace,
  firstWorkspace,
  invitationFixture,
  invitationListFixture,
  memberPermissions,
  ownerPermissions,
  secondWorkspace,
} from "@/test/invitation-fixtures";
import { renderWithQuery } from "@/test/query-wrapper";

vi.mock("@/api/invitations", () => ({
  acceptInvitation: vi.fn(),
  createWorkspaceInvitation: vi.fn(),
  getInvitation: vi.fn(),
  listWorkspaceInvitations: vi.fn(),
  revokeInvitation: vi.fn(),
}));
vi.mock("@/api/settings", () => ({ getUserPreferences: vi.fn() }));

vi.mock("@/api/workspace", () => ({
  createWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
  listWorkspaces: vi.fn(),
  updateWorkspace: vi.fn(),
}));

vi.mock("@/api/workspace-permissions", () => ({
  getWorkspacePermissions: vi.fn(),
}));

const mockedAccept = vi.mocked(acceptInvitation);
const mockedCreate = vi.mocked(createWorkspaceInvitation);
const mockedGet = vi.mocked(getInvitation);
const mockedList = vi.mocked(listWorkspaceInvitations);
const mockedListWorkspaces = vi.mocked(listWorkspaces);
const mockedPermissions = vi.mocked(getWorkspacePermissions);
const mockedRevoke = vi.mocked(revokeInvitation);
const mockedGetPreferences = vi.mocked(getUserPreferences);

const setMobileViewport = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string): MediaQueryList => ({
      addEventListener: () => undefined,
      addListener: () => undefined,
      dispatchEvent: () => false,
      matches,
      media: query,
      onchange: null,
      removeEventListener: () => undefined,
      removeListener: () => undefined,
    }),
    writable: true,
  });
};

const renderPage = (route = "/app/invitations") =>
  renderWithQuery(
    <MemoryRouter initialEntries={[route]}>
      <InvitationsPage />
    </MemoryRouter>,
  );

describe("InvitationsPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    setMobileViewport(false);
    authenticateStore(fakeUser);
    mockedGetPreferences.mockResolvedValue({
      accent: "violet",
      dashboard_period: 30,
      items_per_page: 20,
      motion: "full",
      notify_activity_feed: true,
      notify_assignments: true,
      notify_audit: true,
      notify_comments: true,
      notify_invitations: true,
      theme: "system",
    });
    useWorkspaceStore.setState({ activeWorkspaceId: null });
    mockedListWorkspaces.mockResolvedValue([firstWorkspace, secondWorkspace]);
    mockedPermissions.mockResolvedValue(ownerPermissions);
    mockedList.mockResolvedValue(invitationListFixture);
    mockedGet.mockResolvedValue(invitationFixture);
    mockedCreate.mockResolvedValue(invitationFixture);
    mockedAccept.mockResolvedValue({
      ...invitationFixture,
      accepted_at: "2026-08-01T10:00:00Z",
      status: "accepted",
      workspace_id: acceptedWorkspace.id,
    });
    mockedRevoke.mockResolvedValue({
      ...invitationFixture,
      revoked_at: "2026-08-01T10:00:00Z",
      status: "revoked",
    });
  });

  it("loads the invitation table from the active workspace", async () => {
    renderPage();

    expect(
      await screen.findByText(invitationFixture.email),
    ).toBeInTheDocument();
    expect(screen.getByText("Workspace Owner")).toBeInTheDocument();
    expect(screen.getByText("En attente")).toBeInTheDocument();
    expect(mockedList).toHaveBeenCalledWith(firstWorkspace.id, {
      limit: 20,
      skip: 0,
      sort: "-created_at",
    });
  });

  it("renders loading skeletons while invitations are loading", async () => {
    mockedList.mockReturnValue(new Promise(() => undefined));
    const { container } = renderPage();

    await screen.findByRole("searchbox", { name: "Rechercher une invitation" });
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      0,
    );
  });

  it("renders the empty state", async () => {
    mockedList.mockResolvedValue({ items: [], limit: 20, skip: 0, total: 0 });
    renderPage();

    expect(await screen.findByText("Aucune invitation")).toBeInTheDocument();
  });

  it("uses server pagination", async () => {
    const user = userEvent.setup();
    mockedList.mockResolvedValue({ ...invitationListFixture, total: 21 });
    renderPage();

    await screen.findByText(invitationFixture.email);
    await user.click(screen.getByRole("button", { name: "Page suivante" }));

    await waitFor(() => {
      expect(mockedList).toHaveBeenLastCalledWith(firstWorkspace.id, {
        limit: 20,
        skip: 20,
        sort: "-created_at",
      });
    });
  });

  it("debounces search and sorts through safe server fields", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText(invitationFixture.email);
    await user.type(
      screen.getByRole("searchbox", { name: "Rechercher une invitation" }),
      "owner",
    );
    await user.click(screen.getByRole("button", { name: /Email/ }));

    await waitFor(() => {
      expect(mockedList).toHaveBeenLastCalledWith(firstWorkspace.id, {
        limit: 20,
        search: "owner",
        skip: 0,
        sort: "email",
      });
    });
  });

  it("validates and creates an invitation", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Inviter un membre" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Inviter un membre" });
    const email = within(dialog).getByLabelText("Adresse email");
    await user.type(email, "invalid");
    await user.tab();
    expect(
      await within(dialog).findByText("Saisissez une adresse email valide."),
    ).toBeInTheDocument();
    await user.clear(email);
    await user.type(email, "new@example.com");
    await user.selectOptions(within(dialog).getByLabelText("Rôle"), "viewer");
    await user.click(
      within(dialog).getByRole("button", { name: "Envoyer l’invitation" }),
    );

    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith(firstWorkspace.id, {
        email: "new@example.com",
        role: "viewer",
      });
    });
    expect(await screen.findByText("Invitation envoyée.")).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Inviter un membre" }),
    ).not.toBeInTheDocument();
  });

  it("displays backend creation errors", async () => {
    const user = userEvent.setup();
    mockedCreate.mockRejectedValue(
      new ApiError("A pending invitation already exists.", 409),
    );
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Inviter un membre" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Inviter un membre" });
    await user.type(
      within(dialog).getByLabelText("Adresse email"),
      "new@example.com",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Envoyer l’invitation" }),
    );

    expect(
      await within(dialog).findByText("A pending invitation already exists."),
    ).toBeInTheDocument();
  });

  it("confirms and revokes a pending invitation", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", {
        name: `Révoquer l’invitation de ${invitationFixture.email}`,
      }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Révoquer cette invitation ?",
    });
    await user.click(within(dialog).getByRole("button", { name: "Révoquer" }));

    expect(mockedRevoke).toHaveBeenCalledWith(
      invitationFixture.token,
      expect.anything(),
    );
    expect(await screen.findByText("Invitation révoquée.")).toBeInTheDocument();
  });

  it("accepts a recipient invitation and refreshes the workspace store", async () => {
    const user = userEvent.setup();
    mockedListWorkspaces
      .mockResolvedValueOnce([firstWorkspace, secondWorkspace])
      .mockResolvedValue([firstWorkspace, secondWorkspace, acceptedWorkspace]);
    renderPage(`/app/invitations?token=${invitationFixture.token}`);

    await user.click(await screen.findByRole("button", { name: "Accepter" }));

    await waitFor(() => {
      expect(mockedAccept).toHaveBeenCalledWith(
        invitationFixture.token,
        expect.anything(),
      );
      expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(
        acceptedWorkspace.id,
      );
    });
    expect(await screen.findByText("Invitation acceptée.")).toBeInTheDocument();
  });

  it("declines a recipient invitation through revocation", async () => {
    const user = userEvent.setup();
    renderPage(`/app/invitations?token=${invitationFixture.token}`);

    await user.click(await screen.findByRole("button", { name: "Refuser" }));

    expect(mockedRevoke).toHaveBeenCalledWith(
      invitationFixture.token,
      expect.anything(),
    );
    expect(await screen.findByText("Invitation refusée.")).toBeInTheDocument();
  });

  it("does not expose response actions to a different email", async () => {
    const user = { ...fakeUser, email: "other@example.com" };
    authenticateStore(user);
    renderPage(`/app/invitations?token=${invitationFixture.token}`);

    expect(
      await screen.findByText(
        "Cette invitation est destinée à une autre adresse email.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Accepter" }),
    ).not.toBeInTheDocument();
  });

  it("reloads invitations and permissions after a workspace change", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText(invitationFixture.email);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Workspace actif" }),
      secondWorkspace.id,
    );

    await waitFor(() => {
      expect(mockedPermissions).toHaveBeenCalledWith(secondWorkspace.id);
      expect(mockedList).toHaveBeenLastCalledWith(secondWorkspace.id, {
        limit: 20,
        skip: 0,
        sort: "-created_at",
      });
    });
  });

  it("uses effective permissions and never loads a forbidden list", async () => {
    mockedPermissions.mockResolvedValue(memberPermissions);
    renderPage();

    expect(
      await screen.findByText("Accès aux invitations restreint"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Inviter un membre" }),
    ).not.toBeInTheDocument();
    expect(mockedList).not.toHaveBeenCalled();
  });

  it.each([
    [403, "Accès aux invitations restreint"],
    [404, "Workspace introuvable"],
  ])("renders a dedicated %s state", async (status, title) => {
    mockedPermissions.mockRejectedValue(new ApiError("Denied", status));
    renderPage();

    expect(await screen.findByText(title)).toBeInTheDocument();
  });

  it("shows API errors and retries the invitation list", async () => {
    const user = userEvent.setup();
    mockedList
      .mockRejectedValueOnce(new ApiError("Invitations indisponibles", 503))
      .mockResolvedValueOnce(invitationListFixture);
    renderPage();

    expect(
      await screen.findByText("Invitations indisponibles"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(
      await screen.findByText(invitationFixture.email),
    ).toBeInTheDocument();
  });

  it("renders responsive invitation cards on mobile", async () => {
    setMobileViewport(true);
    renderPage();

    expect(
      await screen.findByText(invitationFixture.email),
    ).toBeInTheDocument();
    expect(screen.getByText(/Expire le/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Pagination des invitations" }),
    ).toBeInTheDocument();
  });
});
