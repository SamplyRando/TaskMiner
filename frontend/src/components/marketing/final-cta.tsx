import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import {
  Eyebrow,
  marketingContainer,
  marketingH2,
  marketingPrimaryCta,
  marketingSecondaryCta,
} from "@/components/marketing/marketing-ui";
import { cn } from "@/lib/utils";

const flow = ["Brief", "Plan relu", "Exécution", "Suivi"];

export function FinalCta() {
  return (
    <section
      aria-labelledby="marketing-cta-title"
      className="py-20 sm:py-24 lg:py-28"
    >
      <div className={marketingContainer}>
        <div className="bg-card rounded-dialog relative overflow-hidden border px-6 py-14 text-center shadow-xs sm:px-12 sm:py-20">
          <div
            aria-hidden="true"
            className="mk-facet-plane mk-facet-plane--cta pointer-events-none absolute inset-0"
          />
          <div className="relative mx-auto max-w-2xl">
            <Eyebrow className="justify-center">Prêt à démarrer</Eyebrow>
            <h2 className={cn(marketingH2, "mt-4")} id="marketing-cta-title">
              Votre prochain projet peut commencer par un plan clair.
            </h2>
            <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-lg leading-relaxed text-pretty">
              Créez votre espace, décrivez votre premier objectif et laissez
              TaskMiner AI préparer le plan. Vous gardez la main, votre équipe
              avance.
            </p>
            <ol
              aria-label="Les étapes avec TaskMiner"
              className="text-muted-foreground mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-sm font-medium"
            >
              {flow.map((step, index) => (
                <li className="inline-flex items-center gap-2" key={step}>
                  <span className="bg-surface-sunken text-foreground rounded-sm border px-2 py-0.5">
                    {step}
                  </span>
                  {index < flow.length - 1 ? (
                    <ArrowRight
                      aria-hidden="true"
                      className="text-brand size-3.5"
                    />
                  ) : null}
                </li>
              ))}
            </ol>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link className={marketingPrimaryCta} to="/register">
                Commencer gratuitement
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link className={marketingSecondaryCta} to="/login">
                Se connecter
              </Link>
            </div>
            <p className="text-muted-foreground mt-5 text-sm">
              Plan Free sans limite de durée · Sans carte bancaire
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
