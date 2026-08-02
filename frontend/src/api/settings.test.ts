import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import {
  changePassword,
  deleteAccount,
  getSettingsProfile,
  getUserPreferences,
  leaveWorkspace,
  updateSettingsProfile,
  updateUserPreferences,
} from "@/api/settings";
import {
  settingsPreferencesFixture,
  settingsProfileFixture,
} from "@/test/settings-fixtures";

describe("settings API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads and updates the authenticated profile", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue({ data: settingsProfileFixture });
    const patch = vi
      .spyOn(apiClient, "patch")
      .mockResolvedValue({ data: settingsProfileFixture });
    const update = { avatar_url: null, full_name: "Ada Lovelace" };

    await expect(getSettingsProfile()).resolves.toEqual(settingsProfileFixture);
    await expect(updateSettingsProfile(update)).resolves.toEqual(
      settingsProfileFixture,
    );
    expect(get).toHaveBeenCalledWith("/users/me");
    expect(patch).toHaveBeenCalledWith("/users/me", update);
  });

  it("loads and partially updates persisted preferences", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue({ data: settingsPreferencesFixture });
    const patch = vi
      .spyOn(apiClient, "patch")
      .mockResolvedValue({ data: settingsPreferencesFixture });

    await expect(getUserPreferences()).resolves.toEqual(
      settingsPreferencesFixture,
    );
    await updateUserPreferences({ theme: "dark" });
    expect(get).toHaveBeenCalledWith("/users/me/preferences");
    expect(patch).toHaveBeenCalledWith("/users/me/preferences", {
      theme: "dark",
    });
  });

  it("changes the password through the dedicated endpoint", async () => {
    const response = {
      access_token: "new-token",
      token_type: "bearer" as const,
    };
    const put = vi
      .spyOn(apiClient, "put")
      .mockResolvedValue({ data: response });
    const payload = {
      confirmation: "New-password-123!",
      current_password: "Old-password-123!",
      new_password: "New-password-123!",
    };

    await expect(changePassword(payload)).resolves.toEqual(response);
    expect(put).toHaveBeenCalledWith("/users/me/password", payload);
  });

  it("uses explicit request bodies for danger-zone operations", async () => {
    const remove = vi
      .spyOn(apiClient, "delete")
      .mockResolvedValue({ data: null });
    const payload = {
      confirmation: "DELETE" as const,
      current_password: "Current-password-123!",
    };

    await deleteAccount(payload);
    await leaveWorkspace("workspace-id", payload);

    expect(remove).toHaveBeenNthCalledWith(1, "/users/me", { data: payload });
    expect(remove).toHaveBeenNthCalledWith(
      2,
      "/users/me/workspaces/workspace-id/membership",
      { data: payload },
    );
  });
});
