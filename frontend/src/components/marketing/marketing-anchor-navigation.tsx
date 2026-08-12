import { useLayoutEffect } from "react";

import {
  ACTIVE_SECTION_EVENT,
  isNavigationSectionId,
  navigationSectionIds,
  type NavigationSectionId,
} from "@/components/marketing/use-active-marketing-section";

const ANCHOR_TARGET_SELECTOR = "[data-marketing-anchor-target]";
const supportedAnchorIds = [
  ...navigationSectionIds,
  "how-it-works",
  "product-proof",
] as const;
type MarketingAnchorId = (typeof supportedAnchorIds)[number];

function getHashSectionId(hash: string): MarketingAnchorId | null {
  if (!hash.startsWith("#")) return null;

  try {
    const sectionId = decodeURIComponent(hash.slice(1));
    return supportedAnchorIds.some((anchorId) => anchorId === sectionId)
      ? (sectionId as MarketingAnchorId)
      : null;
  } catch {
    return null;
  }
}

function getDocumentTop(element: HTMLElement): number {
  let top = 0;
  let current: HTMLElement | null = element;

  while (current) {
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }

  return top;
}

function getAnchorOffset(): number {
  const navbar = document.querySelector<HTMLElement>(".marketing-nav");
  const shell = document.querySelector<HTMLElement>(".marketing-shell");
  const navbarBottom = navbar?.getBoundingClientRect().bottom ?? 0;
  const configuredGap = shell
    ? Number.parseFloat(
        window
          .getComputedStyle(shell)
          .getPropertyValue("--marketing-anchor-gap"),
      )
    : 0;

  return navbarBottom + (Number.isFinite(configuredGap) ? configuredGap : 0);
}

function positionHashTarget(
  sectionId: MarketingAnchorId,
  behavior: ScrollBehavior,
  moveFocus: boolean,
) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const target =
    section.querySelector<HTMLElement>(ANCHOR_TARGET_SELECTOR) ?? section;
  const top = Math.max(0, getDocumentTop(target) - getAnchorOffset());

  window.scrollTo({ behavior, left: 0, top });
  if (moveFocus) target.focus({ preventScroll: true });

  if (isNavigationSectionId(sectionId)) {
    window.dispatchEvent(
      new CustomEvent<NavigationSectionId>(ACTIVE_SECTION_EVENT, {
        detail: sectionId,
      }),
    );
  }
}

export function MarketingAnchorNavigation() {
  useLayoutEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const previousScrollRestoration = window.history.scrollRestoration;
    let scheduledFrame = 0;
    let nestedFrame = 0;

    window.history.scrollRestoration = "manual";

    const schedulePosition = (behavior: ScrollBehavior, moveFocus = false) => {
      window.cancelAnimationFrame(scheduledFrame);
      window.cancelAnimationFrame(nestedFrame);
      const sectionId = getHashSectionId(window.location.hash);
      if (!sectionId) return;

      scheduledFrame = window.requestAnimationFrame(() => {
        nestedFrame = window.requestAnimationFrame(() => {
          positionHashTarget(
            sectionId,
            reducedMotion.matches ? "auto" : behavior,
            moveFocus,
          );
        });
      });
    };

    const handleAnchorClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const clickedElement = event.target;
      if (!(clickedElement instanceof Element)) return;

      const anchor = clickedElement.closest<HTMLAnchorElement>('a[href^="#"]');
      const hash = anchor?.getAttribute("href") ?? "";
      const sectionId = getHashSectionId(hash);
      if (!sectionId) return;

      event.preventDefault();
      if (window.location.hash !== hash) {
        window.history.pushState(null, "", hash);
      }

      schedulePosition("smooth", event.detail === 0);
    };

    const handleHistoryNavigation = () => {
      schedulePosition("smooth");
    };

    const handleResize = () => {
      const sectionId = getHashSectionId(window.location.hash);
      const section = sectionId ? document.getElementById(sectionId) : null;
      if (!section) return;

      const bounds = section.getBoundingClientRect();
      if (bounds.bottom > 0 && bounds.top < window.innerHeight * 0.7) {
        schedulePosition("auto");
      }
    };

    document.addEventListener("click", handleAnchorClick);
    window.addEventListener("hashchange", handleHistoryNavigation);
    window.addEventListener("popstate", handleHistoryNavigation);
    window.addEventListener("resize", handleResize, { passive: true });
    schedulePosition("auto");

    return () => {
      window.cancelAnimationFrame(scheduledFrame);
      window.cancelAnimationFrame(nestedFrame);
      window.history.scrollRestoration = previousScrollRestoration;
      document.removeEventListener("click", handleAnchorClick);
      window.removeEventListener("hashchange", handleHistoryNavigation);
      window.removeEventListener("popstate", handleHistoryNavigation);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return null;
}
