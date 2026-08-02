import type { SettingsProfile, UserPreferences } from "@/types/settings";

export const settingsProfileFixture: SettingsProfile = {
  avatar_url: null,
  created_at: "2026-07-20T10:00:00Z",
  email: "ada@example.com",
  full_name: "Ada Lovelace",
  id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  is_active: true,
  last_login_at: "2026-08-02T08:30:00Z",
  primary_role: "owner",
  updated_at: "2026-08-01T10:00:00Z",
};

export const settingsPreferencesFixture: UserPreferences = {
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
};
