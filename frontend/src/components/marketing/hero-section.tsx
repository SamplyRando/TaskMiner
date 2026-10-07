import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";

import { HeroVisual } from "@/components/marketing/hero-visual";
import {
  Eyebrow,
  marketingContainer,
  marketingPrimaryCta,
  marketingSecondaryCta,
} from "@/components/marketing/marketing-ui";
import { cn } from "@/lib/utils";

const reassurances = [
  "Plan Free sans limite de durée",
  "Sans carte bancaire",
  "Rien n’est créé sans votre validation",
];

export function HeroSection() {
  return (
    <section
      aria-labelledby="marketing-hero-title"
      className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24 lg:pt-16 lg:pb-28"
    >
      <div
        className={cn(
          marketingContainer,
          "grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-12",
        )}
      >
        <div className="max-w-[36rem]">
          <Eyebrow>Gestion de projet assistée par IA</Eyebrow>
          <h1
            className="mt-5 text-[2.25rem] leading-[1.05] font-semibold tracking-[-0.038em] text-balance sm:text-[3.25rem] lg:text-[2.5rem] xl:text-[3.25rem]"
            id="marketing-hero-title"
          >
            <span className="block">Transformez vos idées</span>{" "}
            <span className="text-brand block">en projets qui avancent.</span>
          </h1>
          <p className="text-muted-foreground mt-5 text-base leading-relaxed text-pretty sm:mt-6 sm:text-lg">
            Décrivez votre objectif&nbsp;: TaskMiner AI le structure en tâches,
            priorités et échéances. Vous relisez et validez le plan, puis votre
            équipe l’exécute et le suit au même endroit.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className={marketingPrimaryCta} to="/register">
              Commencer gratuitement
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <a className={marketingSecondaryCta} href="#fonctionnement">
              Voir comment ça marche
            </a>
          </div>
          <ul className="text-muted-foreground mt-7 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-x-5">
            {reassurances.map((item) => (
              <li className="inline-flex items-center gap-2" key={item}>
                <Check
                  aria-hidden="true"
                  className="text-success size-4 shrink-0"
                  strokeWidth={2.5}
                />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}
