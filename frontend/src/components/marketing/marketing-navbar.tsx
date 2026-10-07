import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { BrandLogo } from "@/components/brand-logo";
import {
  marketingPrimaryCta,
  marketingSecondaryCta,
} from "@/components/marketing/marketing-ui";
import { useActiveMarketingSection } from "@/components/marketing/use-active-marketing-section";
import { cn } from "@/lib/utils";

const navigationItems = [
  { href: "#fonctionnement", label: "Fonctionnement" },
  { href: "#produit", label: "Produit" },
  { href: "#tarifs", label: "Tarifs" },
] as const;

const desktopLinkClass =
  "text-muted-foreground hover:bg-accent hover:text-foreground aria-[current=location]:text-foreground rounded-md px-3 py-2 text-sm font-medium transition-colors";

export function MarketingNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(() => window.scrollY > 12);
  const isScrolledRef = useRef(isScrolled);
  const activeSection = useActiveMarketingSection();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const firstMenuLinkRef = useRef<HTMLAnchorElement>(null);

  // Scroll events are coalesced into a single visual update per frame.
  useEffect(() => {
    let scheduledFrame = 0;
    const updateScrolledState = () => {
      scheduledFrame = 0;
      const nextIsScrolled = window.scrollY > 12;
      if (nextIsScrolled === isScrolledRef.current) return;
      isScrolledRef.current = nextIsScrolled;
      setIsScrolled(nextIsScrolled);
    };
    const scheduleScrolledStateUpdate = () => {
      if (scheduledFrame !== 0) return;
      scheduledFrame = window.requestAnimationFrame(updateScrolledState);
    };

    window.addEventListener("scroll", scheduleScrolledStateUpdate, {
      passive: true,
    });
    return () => {
      window.cancelAnimationFrame(scheduledFrame);
      window.removeEventListener("scroll", scheduleScrolledStateUpdate);
    };
  }, []);

  // Mobile menu: scroll lock, initial focus, Escape and focus trap.
  useEffect(() => {
    if (!isMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      firstMenuLinkRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      if (event.key === "Tab") {
        // The close button stays in the cycle so the menu can always be
        // dismissed from the keyboard, even without an Escape key.
        const focusableElements = [
          menuButtonRef.current,
          ...Array.from(
            mobileMenuRef.current?.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ) ?? [],
          ),
        ].filter((element): element is HTMLElement => element !== null);
        const firstElement = focusableElements[0];
        const lastElement = focusableElements.at(-1);

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // The panel and its toggle disappear on large screens: close the menu
    // there so the page never stays locked behind an invisible panel.
    const desktopLayout = window.matchMedia("(min-width: 64rem)");
    const closeOnDesktop = () => {
      if (desktopLayout.matches) setIsMenuOpen(false);
    };
    desktopLayout.addEventListener("change", closeOnDesktop);

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      desktopLayout.removeEventListener("change", closeOnDesktop);
    };
  }, [isMenuOpen]);

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <header
      className={cn(
        "marketing-navbar sticky top-0 z-40 border-b transition-[background-color,border-color] duration-150",
        // No backdrop-filter while the menu is open: it would become the
        // containing block of the fixed mobile panel and collapse it.
        isMenuOpen
          ? "border-border bg-background"
          : isScrolled
            ? "border-border bg-background/90 backdrop-blur-xl"
            : "border-transparent",
        isScrolled && "marketing-navbar--scrolled",
      )}
    >
      <nav
        aria-label="Navigation principale"
        className="marketing-nav mx-auto flex h-16 w-full max-w-7xl items-center gap-6 px-5 sm:px-8"
      >
        <BrandLogo className="shrink-0" onClick={closeMenu} to="/" />

        <div className="hidden items-center gap-1 lg:flex">
          {navigationItems.map((item) => (
            <a
              aria-current={
                activeSection === item.href.slice(1) ? "location" : undefined
              }
              className={desktopLinkClass}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <Link className={desktopLinkClass} to="/login">
            Se connecter
          </Link>
          <Link
            className={cn(marketingPrimaryCta, "h-9 px-4 text-sm")}
            to="/register"
          >
            Commencer gratuitement
          </Link>
        </div>

        <button
          aria-controls="marketing-mobile-menu"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          className="hover:bg-accent text-foreground ml-auto flex size-10 items-center justify-center rounded-md lg:hidden"
          onClick={() => {
            setIsMenuOpen((current) => !current);
          }}
          ref={menuButtonRef}
          type="button"
        >
          {isMenuOpen ? (
            <X aria-hidden="true" className="size-5" />
          ) : (
            <Menu aria-hidden="true" className="size-5" />
          )}
        </button>
      </nav>

      <div
        aria-hidden={!isMenuOpen}
        className={cn(
          "bg-background fixed inset-x-0 top-16 bottom-0 z-30 overflow-y-auto border-t px-5 pt-4 pb-10 lg:hidden",
          // Closed: removed from layout (no transition on visibility, which
          // would keep the links unfocusable at the moment focus moves in).
          !isMenuOpen && "hidden",
        )}
        id="marketing-mobile-menu"
        inert={!isMenuOpen}
        ref={mobileMenuRef}
      >
        <div className="flex flex-col">
          {navigationItems.map((item, index) => (
            <a
              aria-current={
                activeSection === item.href.slice(1) ? "location" : undefined
              }
              className="text-foreground hover:bg-accent flex h-12 items-center rounded-md px-3 text-lg font-medium"
              href={item.href}
              key={item.href}
              onClick={closeMenu}
              ref={index === 0 ? firstMenuLinkRef : undefined}
            >
              {item.label}
            </a>
          ))}
        </div>
        <div className="mt-6 grid gap-3 border-t pt-6">
          <Link
            className={marketingSecondaryCta}
            onClick={closeMenu}
            to="/login"
          >
            Se connecter
          </Link>
          <Link
            className={marketingPrimaryCta}
            onClick={closeMenu}
            to="/register"
          >
            Commencer gratuitement
          </Link>
        </div>
      </div>
    </header>
  );
}
