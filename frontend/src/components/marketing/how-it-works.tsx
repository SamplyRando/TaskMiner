import { Check } from "lucide-react";
import type { ReactNode } from "react";

import {
  FacetNode,
  marketingContainer,
  MockCheck,
  MockPriority,
  SectionHeading,
} from "@/components/marketing/marketing-ui";
import { cn } from "@/lib/utils";

type Step = {
  description: string;
  highlight?: boolean;
  label: string;
  title: string;
  visual: ReactNode;
};

const steps: Step[] = [
  {
    description:
      "Le résultat attendu, l’échéance, les contraintes : quelques lignes suffisent. Le plan peut créer un projet ou enrichir un projet existant.",
    label: "Brief",
    title: "Décrivez l’objectif",
    visual: (
      <div className="space-y-2">
        <p className="bg-surface text-foreground/85 rounded-md border px-2.5 py-2 text-[0.75rem] leading-snug">
          Refondre le site e-commerce avant le 30 novembre, sans interrompre les
          ventes…
        </p>
        <p className="text-muted-foreground text-[0.6875rem]">
          Date cible (optionnelle) · Projet existant ou nouveau
        </p>
      </div>
    ),
  },
  {
    description:
      "Tâches, priorités et échéances suggérées, avec des jalons et des dépendances indicatifs : le tout présenté comme un brouillon.",
    label: "Brouillon structuré",
    title: "TaskMiner AI propose un plan",
    visual: (
      <ul className="space-y-1.5">
        {[
          "Analyse du brief",
          "Structuration du projet",
          "Organisation des dépendances",
          "Préparation du plan",
        ].map((step) => (
          <li
            className="text-foreground/85 flex items-center gap-2 text-[0.75rem]"
            key={step}
          >
            <Check
              aria-hidden="true"
              className="text-success size-3.5 shrink-0"
              strokeWidth={2.5}
            />
            {step}
          </li>
        ))}
      </ul>
    ),
  },
  {
    description:
      "Incluez, modifiez ou écartez chaque tâche proposée. Le brouillon entier peut aussi être ignoré.",
    highlight: true,
    label: "Revue humaine",
    title: "Vous gardez ce qui compte",
    visual: (
      <ul className="space-y-1.5">
        <li className="bg-surface flex items-center gap-2 rounded-md border px-2 py-1.5">
          <MockCheck checked small />
          <span className="min-w-0 flex-1 truncate text-[0.75rem] font-medium">
            Migrer le catalogue
          </span>
          <MockPriority priority="high" />
        </li>
        <li className="bg-surface flex items-center gap-2 rounded-md border px-2 py-1.5 opacity-60">
          <MockCheck checked={false} small />
          <span className="min-w-0 flex-1 truncate text-[0.75rem] font-medium line-through">
            Refaire le blog
          </span>
          <MockPriority priority="low" />
        </li>
      </ul>
    ),
  },
  {
    description:
      "Après votre confirmation seulement, le projet et ses tâches sont créés, avec les assignations que vous avez retenues.",
    label: "Application",
    title: "TaskMiner crée le projet",
    visual: (
      <div className="space-y-2">
        <span className="bg-brand text-brand-foreground inline-flex h-7 items-center rounded-md px-2.5 text-[0.75rem] font-semibold">
          Appliquer le plan
        </span>
        <p className="text-success flex items-center gap-1.5 text-[0.75rem] font-medium">
          <Check aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
          Projet créé · 12 tâches
        </p>
      </div>
    ),
  },
];

export function HowItWorks() {
  return (
    <section
      aria-labelledby="marketing-how-title"
      className="bg-surface-sunken/50 border-y py-20 sm:py-24 lg:py-28"
      id="fonctionnement"
    >
      <div className={marketingContainer}>
        <SectionHeading
          eyebrow="Fonctionnement"
          id="marketing-how-title"
          lead="TaskMiner AI propose, vous décidez. Rien n’est créé dans votre espace de travail avant votre confirmation."
          title="Donnez le contexte. TaskMiner structure le travail."
        />

        <ol className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => (
            <li
              className={cn(
                "bg-card rounded-card relative flex flex-col border p-5 shadow-xs",
                step.highlight && "border-brand-border ring-brand/15 ring-4",
              )}
              key={step.label}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-sm border text-xs font-semibold tabular-nums",
                    step.highlight
                      ? "border-brand-border bg-brand-subtle text-brand"
                      : "bg-surface-sunken text-muted-foreground",
                  )}
                >
                  {index + 1}
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold tracking-wide uppercase",
                    step.highlight ? "text-brand" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>
              <h3 className="mt-4 text-lg leading-snug font-semibold tracking-tight">
                {step.title}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {step.description}
              </p>
              <div aria-hidden="true" className="mt-auto pt-5">
                <div className="bg-surface-sunken rounded-md border p-3">
                  {step.visual}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <p className="bg-card border-brand-border rounded-card mt-6 flex items-start gap-3 border px-5 py-4 text-sm leading-relaxed sm:items-center">
          <FacetNode className="mt-0.5 sm:mt-0" />
          <span>
            <span className="font-semibold">
              Un brouillon reste un brouillon.
            </span>{" "}
            <span className="text-muted-foreground">
              Tant que vous n’avez pas cliqué sur «&nbsp;Appliquer le
              plan&nbsp;», aucune tâche n’est créée et votre projet reste
              inchangé.
            </span>
          </span>
        </p>
      </div>
    </section>
  );
}
