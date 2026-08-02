import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  changePassword,
  deleteAccount,
  getSettingsProfile,
  getUserPreferences,
  leaveWorkspace,
  updateSettingsProfile,
  updateUserPreferences,
} from "@/api/settings";
import { applyAppearance } from "@/lib/appearance";
import { useAuthStore } from "@/store/auth-store";
import type {
  DangerConfirmation,
  PasswordChange,
  ProfileUpdate,
  UserPreferences,
  UserPreferenceUpdate,
} from "@/types/settings";

export const settingsKeys = {
  all: ["settings"] as const,
  profile: () => [...settingsKeys.all, "profile"] as const,
  preferences: () => [...settingsKeys.all, "preferences"] as const,
};

export const useSettingsProfile = () =>
  useQuery({
    queryKey: settingsKeys.profile(),
    queryFn: getSettingsProfile,
    staleTime: 60_000,
  });

export const useUserPreferences = () =>
  useQuery({
    queryKey: settingsKeys.preferences(),
    queryFn: getUserPreferences,
    staleTime: 5 * 60_000,
  });

export const useUpdateSettingsProfile = () => {
  const queryClient = useQueryClient();
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);
  return useMutation({
    mutationFn: (data: ProfileUpdate) => updateSettingsProfile(data),
    onSuccess: (profile) => {
      queryClient.setQueryData(settingsKeys.profile(), profile);
      setCurrentUser(profile);
    },
  });
};

export const useChangePassword = () => {
  const replaceAccessToken = useAuthStore((state) => state.replaceAccessToken);
  return useMutation({
    mutationFn: (data: PasswordChange) => changePassword(data),
    onSuccess: (response) => {
      replaceAccessToken(response.access_token, response.token_type);
    },
  });
};

export const useUpdateUserPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UserPreferenceUpdate) => updateUserPreferences(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.preferences() });
      const previous = queryClient.getQueryData<UserPreferences>(
        settingsKeys.preferences(),
      );
      if (previous) {
        const next = { ...previous, ...data };
        queryClient.setQueryData(settingsKeys.preferences(), next);
        applyAppearance(next)();
      }
      return { previous };
    },
    onError: (_error, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(settingsKeys.preferences(), context.previous);
        applyAppearance(context.previous)();
      }
    },
    onSuccess: (preferences) => {
      queryClient.setQueryData(settingsKeys.preferences(), preferences);
      applyAppearance(preferences)();
    },
  });
};

export const useDeleteAccount = () =>
  useMutation({
    mutationFn: (data: DangerConfirmation) => deleteAccount(data),
  });

type LeaveWorkspaceVariables = {
  workspaceId: string;
  data: DangerConfirmation;
};

export const useLeaveWorkspace = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, workspaceId }: LeaveWorkspaceVariables) =>
      leaveWorkspace(workspaceId, data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workspaces"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
  });
};
