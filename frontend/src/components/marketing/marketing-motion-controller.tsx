import { useLayoutEffect } from "react";

import {
  ACTIVE_SECTION_EVENT,
  isNavigationSectionId,
  navigationSectionIds,
  type NavigationSectionId,
} from "@/components/marketing/use-active-marketing-section";

export function MarketingMotionController() {
  useLayoutEffect(() => {
    const shell = document.querySelector<HTMLElement>(".marketing-shell");
    const revealElements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-marketing-reveal]"),
    );
    const navigationSections = navigationSectionIds
      .map((sectionId) => document.getElementById(sectionId))
      .filter((section): section is HTMLElement => section !== null);
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    shell?.classList.add("marketing-motion-ready");

    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealElements.forEach((element) => {
        element.classList.add("is-visible");
      });
      return () => {
        shell?.classList.remove("marketing-motion-ready");
      };
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.12,
      },
    );

    revealElements.forEach((element) => {
      revealObserver.observe(element);
    });

    const activeSectionObserver = new IntersectionObserver(
      (entries) => {
        const activeEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => {
            if (second.intersectionRatio !== first.intersectionRatio) {
              return second.intersectionRatio - first.intersectionRatio;
            }
            return (
              Math.abs(first.boundingClientRect.top) -
              Math.abs(second.boundingClientRect.top)
            );
          })[0];

        if (!activeEntry || !isNavigationSectionId(activeEntry.target.id)) {
          return;
        }

        window.dispatchEvent(
          new CustomEvent<NavigationSectionId>(ACTIVE_SECTION_EVENT, {
            detail: activeEntry.target.id,
          }),
        );
      },
      {
        rootMargin: "-18% 0px -62% 0px",
        threshold: [0, 0.15, 0.4],
      },
    );

    navigationSections.forEach((section) => {
      activeSectionObserver.observe(section);
    });

    return () => {
      revealObserver.disconnect();
      activeSectionObserver.disconnect();
      shell?.classList.remove("marketing-motion-ready");
    };
  }, []);

  return null;
}
