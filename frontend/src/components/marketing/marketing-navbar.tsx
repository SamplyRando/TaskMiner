import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { BrandMark } from "@/components/brand-logo";
import { useActiveMarketingSection } from "@/components/marketing/use-active-marketing-section";
import { cn } from "@/lib/utils";

const navigationItems = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#demo", label: "Demo" },
  { href: "#faq", label: "FAQ" },
] as const;

export function MarketingNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const activeSection = useActiveMarketingSection();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstMenuLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const updateScrolledState = () => {
      setIsScrolled(window.scrollY > 12);
    };

    updateScrolledState();
    window.addEventListener("scroll", updateScrolledState, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateScrolledState);
    };
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      firstMenuLinkRef.current?.focus();
    });

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMenuOpen]);

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <header
      className={cn("marketing-navbar", {
        "marketing-navbar--open": isMenuOpen,
        "marketing-navbar--scrolled": isScrolled,
      })}
    >
      <nav aria-label="Marketing navigation" className="marketing-nav">
        <Link
          aria-label="TaskMiner home"
          className="marketing-nav__brand"
          onClick={closeMenu}
          to="/"
        >
          <BrandMark className="marketing-nav__mark" />
          <span>TaskMiner</span>
        </Link>

        <div className="marketing-nav__links">
          {navigationItems.map((item) => (
            <a
              aria-current={
                activeSection === item.href.slice(1) ? "location" : undefined
              }
              className={cn({
                "marketing-nav__link--active":
                  activeSection === item.href.slice(1),
              })}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="marketing-nav__actions">
          <Link className="marketing-nav__signin" to="/login">
            Sign in
          </Link>
          <Link
            className="marketing-button marketing-button--compact"
            to="/register"
          >
            Start free
          </Link>
        </div>

        <button
          aria-controls="marketing-mobile-menu"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? "Close navigation" : "Open navigation"}
          className="marketing-nav__menu-button"
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
        className={cn("marketing-mobile-menu", {
          "marketing-mobile-menu--open": isMenuOpen,
        })}
        id="marketing-mobile-menu"
        inert={!isMenuOpen}
      >
        <div className="marketing-mobile-menu__links">
          {navigationItems.map((item, index) => (
            <a
              aria-current={
                activeSection === item.href.slice(1) ? "location" : undefined
              }
              className={cn({
                "marketing-nav__link--active":
                  activeSection === item.href.slice(1),
              })}
              href={item.href}
              key={item.href}
              onClick={closeMenu}
              ref={index === 0 ? firstMenuLinkRef : undefined}
            >
              {item.label}
            </a>
          ))}
        </div>
        <div className="marketing-mobile-menu__actions">
          <Link
            className="marketing-button marketing-button--secondary"
            onClick={closeMenu}
            to="/login"
          >
            Sign in
          </Link>
          <Link className="marketing-button" onClick={closeMenu} to="/register">
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
