import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { metaPixel } from "@/lib/meta-pixel";
import {
  selectHasAdvertisingConsent,
  useConsentStore,
} from "@/store/consent-store";

/**
 * Applies the advertising consent to the Meta Pixel and sends one PageView
 * per page: a new path or query, including client-side navigations. Anchors
 * (#tarifs…) are not pages.
 */
export function MetaPixelTracker() {
  const hasConsent = useConsentStore(selectHasAdvertisingConsent);
  const { pathname, search } = useLocation();

  useEffect(() => {
    metaPixel.update(hasConsent);
    metaPixel.trackPageView(`${pathname}${search}`);
  }, [hasConsent, pathname, search]);

  return null;
}
