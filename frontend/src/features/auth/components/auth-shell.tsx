import type { ReactNode } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { Facet } from "@/components/ui/facet";
import { usePublicAppearance } from "@/hooks/use-public-appearance";

const flow = [
  { detail: "Vous décrivez l’objectif.", label: "Brief" },
  {
    detail: "TaskMiner AI propose tâches, priorités et jalons.",
    label: "Brouillon structuré",
  },
  { detail: "Vous gardez ce qui compte.", label: "Revue humaine" },
  { detail: "Votre équipe avance et suit le travail.", label: "Exécution" },
];

type AuthShellProps = {
  children: ReactNode;
  description: string;
  title: string;
};

/**
 * Shared shell of the public account pages (login, register, email
 * verification, password reset). Deliberately sober: the form stays the
 * focus, with a discreet Facette panel on large screens only. The page title
 * is the document's h1.
 */
export function AuthShell({ children, description, title }: AuthShellProps) {
  usePublicAppearance();

  return (
    <div className="bg-background text-foreground grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
      <main className="flex min-w-0 flex-col px-5 py-6 sm:px-10 sm:py-8">
        <BrandLogo className="self-start" to="/" />
        <div className="flex flex-1 items-start justify-center pt-10 pb-8 sm:items-center sm:py-14">
          <div className="w-full max-w-[25rem]">
            <h1 className="text-page-title text-balance">{title}</h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {description}
            </p>
            <div className="mt-8 space-y-6">{children}</div>
          </div>
        </div>
      </main>

      {/* The dark class scopes the dark Facette tokens to this panel. */}
      <aside
        aria-label="TaskMiner en bref"
        className="dark bg-background text-foreground dark:bg-surface relative hidden overflow-hidden border-l lg:flex lg:flex-col lg:justify-center lg:px-12 xl:px-16"
      >
        <div
          aria-hidden="true"
          className="from-brand-subtle pointer-events-none absolute inset-0 bg-linear-to-b to-transparent to-70% [clip-path:polygon(6rem_0,100%_0,100%_100%,0_100%,0_6rem)]"
        />
        <div className="relative max-w-md">
          <p className="text-brand inline-flex items-center gap-2 text-sm font-medium">
            <Facet className="size-3.5" tone="current" />
            Gestion de projet assistée par IA
          </p>
          <p className="mt-5 text-[2rem] leading-[1.1] font-semibold tracking-[-0.03em]">
            <span className="block">L’IA propose.</span>{" "}
            <span className="text-brand block">Vous décidez.</span>
          </p>
          <ol aria-label="Le parcours TaskMiner" className="mt-10 space-y-5">
            {flow.map((step, index) => (
              <li className="flex gap-3.5" key={step.label}>
                <span className="border-brand-border bg-brand-subtle text-brand flex size-6 shrink-0 items-center justify-center rounded-sm border text-xs font-semibold tabular-nums">
                  {index + 1}
                </span>
                <span>
                  <span className="block text-sm font-semibold">
                    {step.label}
                  </span>
                  <span className="text-muted-foreground block text-sm">
                    {step.detail}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}
