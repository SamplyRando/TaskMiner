import { Link } from "react-router-dom";

import { BrandLogo } from "@/components/brand-logo";
import { marketingContainer } from "@/components/marketing/marketing-ui";
import { cn } from "@/lib/utils";

type FooterLink = { href: string; label: string };

const footerColumns: { links: FooterLink[]; title: string }[] = [
  {
    links: [
      { href: "#fonctionnement", label: "Fonctionnement" },
      { href: "#produit", label: "Fonctionnalités" },
      { href: "#tarifs", label: "Tarifs" },
      { href: "#faq", label: "Questions fréquentes" },
    ],
    title: "Produit",
  },
  {
    links: [
      { href: "/register", label: "Créer un compte" },
      { href: "/login", label: "Se connecter" },
    ],
    title: "Compte",
  },
  {
    links: [
      { href: "/legal", label: "Mentions légales" },
      { href: "/privacy", label: "Confidentialité" },
      { href: "/terms", label: "Conditions d’utilisation" },
      { href: "/terms", label: "Médiation (CGU, art. 16)" },
    ],
    title: "Informations légales",
  },
  {
    links: [
      { href: "mailto:hello@taskminer.app", label: "hello@taskminer.app" },
    ],
    title: "Contact",
  },
];

const linkClass =
  "text-muted-foreground hover:text-foreground rounded-sm text-sm transition-colors";

export function MarketingFooter() {
  return (
    <footer className="border-t">
      <div className={cn(marketingContainer, "py-14 sm:py-16")}>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="max-w-xs">
            <BrandLogo to="/" />
            <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
              Gestion de projet assistée par IA&nbsp;: du brief au plan, du plan
              à l’exécution. L’IA propose, vous décidez.
            </p>
          </div>

          <nav
            aria-label="Pied de page"
            className="grid grid-cols-2 gap-8 sm:grid-cols-4"
          >
            {footerColumns.map((column) => {
              const titleId = `marketing-footer-${column.title
                .toLowerCase()
                .normalize("NFD")
                .replace(/[^a-z]+/g, "-")}`;
              return (
                <div key={column.title}>
                  <p
                    className="text-foreground text-sm font-semibold"
                    id={titleId}
                  >
                    {column.title}
                  </p>
                  <ul aria-labelledby={titleId} className="mt-4 space-y-2.5">
                    {column.links.map((link) => (
                      <li key={link.label}>
                        {link.href.startsWith("/") ? (
                          <Link className={linkClass} to={link.href}>
                            {link.label}
                          </Link>
                        ) : (
                          <a
                            className={cn(linkClass, "break-all")}
                            href={link.href}
                          >
                            {link.label}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="text-muted-foreground mt-12 flex flex-col gap-2 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} TaskMiner</p>
          <p>Édité en France · Paiements gérés par Stripe</p>
        </div>
      </div>
    </footer>
  );
}
