import { Outlet } from "react-router-dom";

/**
 * Public shell reserved for marketing routes.
 * It intentionally stays independent from the authenticated application layout.
 */
export function MarketingLayout() {
  return <Outlet />;
}
