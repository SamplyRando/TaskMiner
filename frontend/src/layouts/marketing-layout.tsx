import { Outlet } from "react-router-dom";

import { MarketingNavbar } from "@/components/marketing/marketing-navbar";
import { useDocumentLanguage } from "@/hooks/use-document-language";
import "@/styles/marketing.css";

/**
 * Public shell reserved for marketing routes.
 * It intentionally stays independent from the authenticated application layout.
 */
export function MarketingLayout() {
  // The landing page is still written in English (French translation is a
  // later sprint); the rest of the app is French.
  useDocumentLanguage("en");

  return (
    <div className="marketing-shell">
      <a className="marketing-skip-link" href="#marketing-content">
        Skip to content
      </a>
      <div aria-hidden="true" className="marketing-backdrop" />
      <MarketingNavbar />
      <Outlet />
    </div>
  );
}
