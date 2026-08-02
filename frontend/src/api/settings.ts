import { apiClient } from "@/api/client";
import type {
  DangerConfirmation,
  PasswordChange,
  PasswordChangeResponse,
  ProfileUpdate,
  SettingsProfile,
  UserPreferences,
  UserPreferenceUpdate,
} from "@/types/settings";

export const getSettingsProfile = async (): Promise<SettingsProfile> => {
  const response = await apiClient.get<SettingsProfile>("/users/me");
  return response.data;
};

export const updateSettingsProfile = async (
  data: ProfileUpdate,
): Promise<SettingsProfile> => {
  const response = await apiClient.patch<SettingsProfile>("/users/me", data);
  return response.data;
};

export const changePassword = async (
  data: PasswordChange,
): Promise<PasswordChangeResponse> => {
  const response = await apiClient.put<PasswordChangeResponse>(
    "/users/me/password",
    data,
  );
  return response.data;
};

export const getUserPreferences = async (): Promise<UserPreferences> => {
  const response = await apiClient.get<UserPreferences>(
    "/users/me/preferences",
  );
  return response.data;
};

export const updateUserPreferences = async (
  data: UserPreferenceUpdate,
): Promise<UserPreferences> => {
  const response = await apiClient.patch<UserPreferences>(
    "/users/me/preferences",
    data,
  );
  return response.data;
};

export const deleteAccount = async (
  data: DangerConfirmation,
): Promise<void> => {
  await apiClient.delete("/users/me", { data });
};

export const leaveWorkspace = async (
  workspaceId: string,
  data: DangerConfirmation,
): Promise<void> => {
  await apiClient.delete(`/users/me/workspaces/${workspaceId}/membership`, {
    data,
  });
};
