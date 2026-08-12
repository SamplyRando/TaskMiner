import { useEffect, useState } from "react";

export const ACTIVE_SECTION_EVENT = "taskminer:marketing-active-section";
export const navigationSectionIds = [
  "features",
  "pricing",
  "demo",
  "faq",
] as const;

export type NavigationSectionId = (typeof navigationSectionIds)[number];

export function isNavigationSectionId(
  value: string,
): value is NavigationSectionId {
  return navigationSectionIds.some((sectionId) => sectionId === value);
}

export function useActiveMarketingSection() {
  const [activeSection, setActiveSection] =
    useState<NavigationSectionId | null>(null);

  useEffect(() => {
    const updateActiveSection = (event: Event) => {
      const sectionId = (event as CustomEvent<string>).detail;
      if (isNavigationSectionId(sectionId)) setActiveSection(sectionId);
    };

    window.addEventListener(ACTIVE_SECTION_EVENT, updateActiveSection);
    return () => {
      window.removeEventListener(ACTIVE_SECTION_EVENT, updateActiveSection);
    };
  }, []);

  return activeSection;
}
