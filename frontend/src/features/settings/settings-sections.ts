import {
  Bell,
  Brush,
  CircleUserRound,
  KeyRound,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react";

export const settingsSections = [
  { id: "profile", label: "Profil", icon: CircleUserRound },
  { id: "security", label: "Sécurité", icon: KeyRound },
  { id: "preferences", label: "Préférences", icon: SlidersHorizontal },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Apparence", icon: Brush },
  { id: "danger", label: "Danger Zone", icon: TriangleAlert },
] as const;

export type SettingsSection = (typeof settingsSections)[number]["id"];
