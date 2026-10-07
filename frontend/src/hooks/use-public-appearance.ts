import { useLayoutEffect } from "react";

import { applyAppearance } from "@/lib/appearance";

/**
 * Public pages (landing, authentication, legal) have no user preferences:
 * they follow the visitor's system theme with the default accent, through the
 * same engine as the application. This also clears a theme or an accent left
 * on <html> by a previous session in the same tab (after a logout). A reduced
 * motion choice already present is kept, since it only removes animations.
 */
export function usePublicAppearance() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    return applyAppearance({
      accent: "violet",
      motion: root.classList.contains("reduce-motion") ? "reduced" : "full",
      theme: "system",
    });
  }, []);
}
