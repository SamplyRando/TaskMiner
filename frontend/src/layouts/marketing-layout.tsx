import { Outlet } from "react-router-dom";

import { MarketingNavbar } from "@/components/marketing/marketing-navbar";
import "@/styles/marketing.css";

/**
 * Public shell reserved for marketing routes.
 * It intentionally stays independent from the authenticated application layout.
 */
export function MarketingLayout() {
  return (
    <div className="marketing-shell">
      <div aria-hidden="true" className="marketing-backdrop" />
      <MarketingNavbar />
      <Outlet />
    </div>
  );
}
