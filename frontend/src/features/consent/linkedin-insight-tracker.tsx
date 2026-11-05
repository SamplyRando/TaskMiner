import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { linkedInInsightTag } from "@/lib/linkedin-insight";
import {
  selectHasAdvertisingConsent,
  useConsentStore,
} from "@/store/consent-store";

/** Keeps LinkedIn aligned with the shared marketing consent and current URL. */
export function LinkedInInsightTracker() {
  const hasConsent = useConsentStore(selectHasAdvertisingConsent);
  const { pathname, search } = useLocation();

  useEffect(() => {
    linkedInInsightTag.update(hasConsent);
  }, [hasConsent, pathname, search]);

  return null;
}
