import type { UserPreferences } from "@/types/settings";

export const applyAppearance = (
  preferences: Pick<UserPreferences, "accent" | "motion" | "theme">,
): (() => void) => {
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const applyTheme = () => {
    const dark =
      preferences.theme === "dark" ||
      (preferences.theme === "system" && media.matches);
    root.classList.toggle("dark", dark);
  };

  root.dataset.accent = preferences.accent;
  root.classList.toggle("reduce-motion", preferences.motion === "reduced");
  applyTheme();
  media.addEventListener("change", applyTheme);

  return () => {
    media.removeEventListener("change", applyTheme);
  };
};
