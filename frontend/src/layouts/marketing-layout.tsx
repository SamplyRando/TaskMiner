import { Outlet } from "react-router-dom";

import { MarketingNavbar } from "@/components/marketing/marketing-navbar";
import { SkipLink } from "@/components/skip-link";
import { usePublicAppearance } from "@/hooks/use-public-appearance";
import "@/styles/marketing.css";

/**
 * Public shell reserved for marketing routes. It stays independent from the
 * authenticated layout but shares its design system and theme engine.
 */
export function MarketingLayout() {
  usePublicAppearance();

  return (
    <div className="marketing-shell bg-background text-foreground min-h-screen">
      <SkipLink targetId="marketing-content" />
      <MarketingNavbar />
      <Outlet />
    </div>
  );
}
