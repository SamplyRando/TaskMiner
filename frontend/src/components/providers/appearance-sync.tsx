import { useEffect } from "react";

import { useUserPreferences } from "@/features/settings/hooks";
import { applyAppearance } from "@/lib/appearance";

export function AppearanceSync() {
  const preferences = useUserPreferences();
  useEffect(() => {
    if (!preferences.data) return undefined;
    return applyAppearance(preferences.data);
  }, [preferences.data]);
  return null;
}
