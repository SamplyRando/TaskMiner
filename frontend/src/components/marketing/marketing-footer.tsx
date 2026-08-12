import { AtSign, BriefcaseBusiness, Code2 } from "lucide-react";
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
      { href: "/about", label: "About" },
      { href: "/blog", label: "Blog" },
      { href: "/careers", label: "Careers" },
    ],
    title: "Company",
  },
  {
    links: [
      { href: "/documentation", label: "Documentation" },
      { href: "/api", label: "API" },
      { href: "#faq", label: "Help Center" },
    ],
    title: "Resources",
  },
  {
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/cookies", label: "Cookies" },
    ],
    title: "Legal",
  },
] as const;

const socialLinks = [
  { href: "https://github.com", icon: Code2, label: "TaskMiner on GitHub" },
  { href: "https://x.com", icon: AtSign, label: "TaskMiner on X" },
  {
    href: "https://linkedin.com",
    icon: BriefcaseBusiness,
    label: "TaskMiner on LinkedIn",
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
              One intelligent workspace for teams that want to spend less time
              managing work and more time moving it forward.
            </p>
            <div className="marketing-footer__socials">
              {socialLinks.map(({ href, icon: Icon, label }) => (
                <a
                  aria-label={label}
                  href={href}
                  key={label}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Icon aria-hidden="true" />
                </a>
              ))}
            </div>
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
            Built with AI.
          </span>
        </div>
      </div>
    </footer>
  );
}
