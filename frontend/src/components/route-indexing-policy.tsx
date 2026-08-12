import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const PUBLIC_MARKETING_PATH = "/";

export function RouteIndexingPolicy() {
  const { pathname } = useLocation();

  useEffect(() => {
    const robotsMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="robots"]',
    );

    robotsMeta?.setAttribute(
      "content",
      pathname === PUBLIC_MARKETING_PATH
        ? "index, follow"
        : "noindex, nofollow",
    );
  }, [pathname]);

  return null;
}
