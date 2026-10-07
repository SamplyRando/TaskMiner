import { useEffect, useState } from "react";

export const ACTIVE_SECTION_EVENT = "taskminer:marketing-active-section";
export const navigationSectionIds = [
  "fonctionnement",
  "produit",
  "tarifs",
] as const;

export type NavigationSectionId = (typeof navigationSectionIds)[number];

/** Every in-page anchor handled by the marketing anchor engine. */
export const marketingAnchorIds = [...navigationSectionIds, "faq"] as const;

export function isNavigationSectionId(
  value: string,
): value is NavigationSectionId {
  return navigationSectionIds.some((sectionId) => sectionId === value);
}

export function useActiveMarketingSection() {
  const [activeSection, setActiveSection] =
    useState<NavigationSectionId | null>(null);

  useEffect(() => {
    // An anchor outside the navigation (e.g. #faq) clears the active link.
    const updateActiveSection = (event: Event) => {
      const sectionId = (event as CustomEvent<string | null>).detail;
      setActiveSection(
        sectionId !== null && isNavigationSectionId(sectionId)
          ? sectionId
          : null,
      );
    };

    window.addEventListener(ACTIVE_SECTION_EVENT, updateActiveSection);
    return () => {
      window.removeEventListener(ACTIVE_SECTION_EVENT, updateActiveSection);
    };
  }, []);

  return activeSection;
}
