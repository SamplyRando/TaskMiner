import { Link } from "react-router-dom";

import { BrandMark } from "@/components/brand-logo";

const footerColumns = [
  {
    links: [
      { href: "#features", label: "Features" },
      { href: "#pricing", label: "Pricing" },
      { href: "#demo", label: "Demo" },
    ],
    title: "Product",
  },
  {
    links: [
      { href: "/register", label: "Create account" },
      { href: "/login", label: "Sign in" },
      { href: "#faq", label: "FAQ" },
    ],
    title: "Get started",
  },
  {
    links: [
      { href: "#how-it-works", label: "How it works" },
      { href: "#product-proof", label: "Product proof" },
      { href: "#demo", label: "AI planning demo" },
    ],
    title: "Explore",
  },
  {
    links: [
      {
        href: "mailto:hello@taskminer.app?subject=TaskMiner%20demo",
        label: "Book a demo",
      },
      {
        href: "mailto:hello@taskminer.app?subject=TaskMiner%20support",
        label: "Contact support",
      },
      {
        href: "mailto:hello@taskminer.app?subject=TaskMiner%20Enterprise",
        label: "Enterprise inquiry",
      },
    ],
    title: "Contact",
  },
] as const;

export function MarketingFooter() {
  return (
    <footer className="marketing-footer">
      <div className="marketing-section-shell">
        <div className="marketing-footer__main">
          <div
            className="marketing-footer__brand-column marketing-motion-reveal marketing-motion-reveal--up"
            data-marketing-reveal
          >
            <Link
              aria-label="TaskMiner home"
              className="marketing-footer__brand"
              to="/"
            >
              <BrandMark />
              <span>TaskMiner</span>
            </Link>
            <p>
              AI-assisted project management that turns context into prioritized
              work your team can review, assign, and deliver.
            </p>
          </div>

          <nav
            aria-label="Footer navigation"
            className="marketing-footer__nav marketing-motion-reveal marketing-motion-reveal--up"
            data-marketing-reveal
          >
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h2>{column.title}</h2>
                <ul>
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href}>{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div
          className="marketing-footer__bottom marketing-motion-reveal marketing-motion-reveal--up"
          data-marketing-reveal
        >
          <span>© 2026 TaskMiner</span>
          <span>
            <i aria-hidden="true" />
            Built for focused work.
          </span>
        </div>
      </div>
    </footer>
  );
}
