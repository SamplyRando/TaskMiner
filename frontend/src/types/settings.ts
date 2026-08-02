import type { TokenResponse, UserProfile } from "@/types/auth";
import type { WorkspaceRole } from "@/types/permissions";

export type ThemePreference = "light" | "dark" | "system";
export type MotionPreference = "full" | "reduced";
export type AccentPreference = "violet" | "blue" | "green" | "orange";
export type ItemsPerPage = 10 | 20 | 50 | 100;
export type DashboardPeriod = 7 | 30 | 90;

export type SettingsProfile = Omit<UserProfile, "full_name"> & {
  full_name: string;
  avatar_url: string | null;
  last_login_at: string | null;
  primary_role: WorkspaceRole | null;
};

export type ProfileUpdate = {
  full_name: string;
  avatar_url: string | null;
};

export type PasswordChange = {
  current_password: string;
  new_password: string;
  confirmation: string;
};

export type UserPreferences = {
  theme: ThemePreference;
  motion: MotionPreference;
  items_per_page: ItemsPerPage;
  dashboard_period: DashboardPeriod;
  accent: AccentPreference;
  notify_activity_feed: boolean;
  notify_audit: boolean;
  notify_invitations: boolean;
  notify_comments: boolean;
  notify_assignments: boolean;
};

export type UserPreferenceUpdate = Partial<UserPreferences>;

export type DangerConfirmation = {
  confirmation: "DELETE" | "SUPPRIMER";
  current_password: string;
};

export type PasswordChangeResponse = TokenResponse;
