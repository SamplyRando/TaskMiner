import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { BrandLogo } from "@/components/brand-logo";
import { useDocumentTitle } from "@/hooks/use-document-title";

type PublicLegalDocumentProps = {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
  updatedAt: string;
};

type LegalSectionProps = {
  children: ReactNode;
  title: string;
};

export function LegalSection({ children, title }: LegalSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
        {title}
      </h2>
      <div className="text-muted-foreground space-y-3 leading-7">
        {children}
      </div>
    </section>
  );
}

export function LegalPlaceholder({ children }: { children: ReactNode }) {
  return (
    <p className="border-primary/25 bg-primary/5 text-foreground rounded-lg border px-4 py-3 font-medium break-words">
      [À COMPLÉTER AVANT LANCEMENT PUBLIC : {children}]
    </p>
  );
}

export function PublicLegalDocument({
  children,
  description,
  eyebrow,
  title,
  updatedAt,
}: PublicLegalDocumentProps) {
  useDocumentTitle(title);

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="border-border/70 bg-background/95 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <BrandLogo to="/" />
          <Link
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-md px-2 py-1 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            to="/"
          >
            Retour à TaskMiner
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <article className="space-y-10 sm:space-y-12">
          <header className="space-y-5 border-b pb-8 sm:pb-10">
            <p className="text-primary text-sm font-semibold tracking-wide uppercase">
              {eyebrow}
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            <p className="text-muted-foreground max-w-3xl text-base leading-7 sm:text-lg">
              {description}
            </p>
            <p className="text-muted-foreground text-sm">
              Dernière mise à jour : {updatedAt}
            </p>
          </header>

          {children}
        </article>
      </main>

      <footer className="border-border border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>© 2026 TaskMiner</span>
          <nav aria-label="Informations légales">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              <li>
                <Link
                  className="hover:text-foreground hover:underline"
                  to="/privacy"
                >
                  Confidentialité
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-foreground hover:underline"
                  to="/legal"
                >
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-foreground hover:underline"
                  to="/terms"
                >
                  Conditions d’utilisation
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}
