import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  changePassword,
  deleteAccount,
  getSettingsProfile,
  getUserPreferences,
  leaveWorkspace,
  updateSettingsProfile,
  updateUserPreferences,
} from "@/api/settings";
import { getWorkspacePermissions } from "@/api/workspace-permissions";
import { deleteWorkspace, listWorkspaces } from "@/api/workspace";
import { SettingsPage } from "@/pages/settings-page";
import { useAuthStore } from "@/store/auth-store";
import {
  settingsPreferencesFixture,
  settingsProfileFixture,
} from "@/test/settings-fixtures";
import { workspaceFixture } from "@/test/resource-fixtures";

vi.mock("@/api/settings", () => ({
  changePassword: vi.fn(),
  deleteAccount: vi.fn(),
  getSettingsProfile: vi.fn(),
  getUserPreferences: vi.fn(),
  leaveWorkspace: vi.fn(),
  updateSettingsProfile: vi.fn(),
  updateUserPreferences: vi.fn(),
}));
vi.mock("@/api/workspace", () => ({
  createWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
  listWorkspaces: vi.fn(),
  updateWorkspace: vi.fn(),
}));
vi.mock("@/api/workspace-permissions", () => ({
  getWorkspacePermissions: vi.fn(),
}));

const mockedChangePassword = vi.mocked(changePassword);
const mockedDeleteAccount = vi.mocked(deleteAccount);
const mockedGetProfile = vi.mocked(getSettingsProfile);
const mockedGetPreferences = vi.mocked(getUserPreferences);
const mockedLeaveWorkspace = vi.mocked(leaveWorkspace);
const mockedListWorkspaces = vi.mocked(listWorkspaces);
const mockedPermissions = vi.mocked(getWorkspacePermissions);
const mockedUpdateProfile = vi.mocked(updateSettingsProfile);
const mockedUpdatePreferences = vi.mocked(updateUserPreferences);
const mockedDeleteWorkspace = vi.mocked(deleteWorkspace);

const renderPage = (entry = "/app/settings") => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.className = "";
    delete document.documentElement.dataset.accent;
    mockedGetProfile.mockResolvedValue(settingsProfileFixture);
    mockedGetPreferences.mockResolvedValue(settingsPreferencesFixture);
    mockedUpdateProfile.mockResolvedValue(settingsProfileFixture);
    mockedUpdatePreferences.mockImplementation((data) =>
      Promise.resolve({ ...settingsPreferencesFixture, ...data }),
    );
    mockedChangePassword.mockResolvedValue({
      access_token: "replacement-token",
      token_type: "bearer",
    });
    mockedDeleteAccount.mockResolvedValue();
    mockedLeaveWorkspace.mockResolvedValue();
    mockedDeleteWorkspace.mockResolvedValue();
    mockedListWorkspaces.mockResolvedValue([workspaceFixture]);
    mockedPermissions.mockResolvedValue({
      permissions: {
        manage_invitations: true,
        manage_members: true,
        manage_projects: true,
        manage_tasks: true,
        manage_workspace: true,
        read: true,
      },
      role: "owner",
    });
    useAuthStore.setState({
      accessToken: "active-token",
      currentUser: settingsProfileFixture,
      isAuthenticated: true,
      isHydrated: true,
      tokenType: "bearer",
    });
  });

  it("renders profile data, initials, role and accessible navigation", async () => {
    renderPage();

    expect(await screen.findByDisplayValue("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByDisplayValue("ada@example.com")).toBeDisabled();
    expect(screen.getByText("AL")).toBeInTheDocument();
    expect(screen.getByText("owner")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Sections des paramètres" }),
    ).toHaveClass("overflow-x-auto");
  });

  it("updates the profile and synchronizes the auth store", async () => {
    const user = userEvent.setup();
    mockedUpdateProfile.mockResolvedValue({
      ...settingsProfileFixture,
      full_name: "Grace Hopper",
    });
    renderPage();
    const name = await screen.findByDisplayValue("Ada Lovelace");
    await user.clear(name);
    await user.type(name, "  Grace Hopper  ");
    await user.click(
      screen.getByRole("button", { name: "Enregistrer le profil" }),
    );

    await waitFor(() => {
      expect(mockedUpdateProfile).toHaveBeenCalledWith({
        avatar_url: null,
        full_name: "Grace Hopper",
      });
    });
    expect(await screen.findByText("Profil mis à jour.")).toBeInTheDocument();
    expect(useAuthStore.getState().currentUser?.full_name).toBe("Grace Hopper");
  });

  it("keeps the selected security section in the URL and validates passwords", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByDisplayValue("Ada Lovelace");
    await user.click(screen.getByRole("button", { name: "Sécurité" }));
    expect(
      await screen.findByText("Mot de passe", { selector: "h3" }),
    ).toBeInTheDocument();
    expect(screen.getByText("12 caractères")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Changer le mot de passe" }),
    );
    expect(await screen.findAllByText(/requis|caractères/i)).not.toHaveLength(
      0,
    );
    expect(mockedChangePassword).not.toHaveBeenCalled();
  });

  it("changes the password, rotates the token and shows a toast", async () => {
    const user = userEvent.setup();
    renderPage("/app/settings?section=security");
    const fields = await screen.findAllByLabelText(
      /Mot de passe actuel|Nouveau mot de passe|Confirmation/,
    );
    const [currentPassword, newPassword, confirmation] = fields;
    if (!currentPassword || !newPassword || !confirmation) {
      throw new Error("Password fields are missing");
    }
    await user.type(currentPassword, "Current-password-123!");
    await user.type(newPassword, "New-password-456!");
    await user.type(confirmation, "New-password-456!");
    await user.click(
      screen.getByRole("button", { name: "Changer le mot de passe" }),
    );

    await waitFor(() => {
      expect(mockedChangePassword).toHaveBeenCalled();
    });
    expect(useAuthStore.getState().accessToken).toBe("replacement-token");
    expect(
      await screen.findByText(/autres sessions ont été invalidées/i),
    ).toBeInTheDocument();
  });

  it("persists list density and dashboard period through React Query", async () => {
    const user = userEvent.setup();
    renderPage("/app/settings?section=preferences");
    const pageSize = await screen.findByLabelText(/Éléments par page/);
    await user.selectOptions(pageSize, "50");

    await waitFor(() => {
      expect(mockedUpdatePreferences).toHaveBeenCalledWith({
        items_per_page: 50,
      });
    });
    expect(
      await screen.findByText("Préférences enregistrées."),
    ).toBeInTheDocument();
  });

  it("persists notification switches without simulated permissions", async () => {
    const user = userEvent.setup();
    renderPage("/app/settings?section=notifications");
    const comments = await screen.findByRole("switch", {
      name: "Notifications Commentaires",
    });
    await user.click(comments);

    await waitFor(() => {
      expect(mockedUpdatePreferences).toHaveBeenCalledWith({
        notify_comments: false,
      });
    });
    expect(comments).toHaveAttribute("aria-checked", "false");
  });

  it("applies theme, accent and reduced motion immediately", async () => {
    const user = userEvent.setup();
    renderPage("/app/settings?section=appearance");
    await user.selectOptions(await screen.findByLabelText("Thème"), "dark");
    await user.click(screen.getByRole("button", { name: "Vert" }));
    await user.click(
      screen.getByRole("switch", { name: "Réduire les animations" }),
    );

    await waitFor(() => {
      expect(mockedUpdatePreferences).toHaveBeenCalledWith({ theme: "dark" });
      expect(mockedUpdatePreferences).toHaveBeenCalledWith({ accent: "green" });
      expect(mockedUpdatePreferences).toHaveBeenCalledWith({
        motion: "reduced",
      });
    });
  });

  it("protects danger actions with role-aware and double confirmations", async () => {
    const user = userEvent.setup();
    renderPage("/app/settings?section=danger");
    const deleteAccountButton = await screen.findByRole("button", {
      name: "Supprimer le compte",
    });
    expect(screen.getByRole("button", { name: "Quitter" })).toBeDisabled();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Supprimer" })).toBeEnabled();
    });
    await user.click(deleteAccountButton);
    await user.click(
      screen.getByRole("button", {
        name: "Supprimer définitivement mon accès",
      }),
    );
    expect(
      await screen.findByText("Saisissez DELETE ou SUPPRIMER."),
    ).toBeInTheDocument();
    expect(mockedDeleteAccount).not.toHaveBeenCalled();
  });
});
