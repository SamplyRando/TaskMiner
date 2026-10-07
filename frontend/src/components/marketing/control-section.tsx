import {
  FileCheck2,
  Gauge,
  History,
  ListChecks,
  type LucideIcon,
} from "lucide-react";

import {
  Eyebrow,
  marketingContainer,
} from "@/components/marketing/marketing-ui";
import { cn } from "@/lib/utils";

const commitments: { description: string; icon: LucideIcon; title: string }[] =
  [
    {
      description:
        "Un plan ou une modification générés restent un brouillon jusqu’à votre validation explicite.",
      icon: FileCheck2,
      title: "Un brouillon, jamais une action",
    },
    {
      description:
        "Vous incluez, ajustez ou écartez chaque proposition. Le reste du projet ne bouge pas.",
      icon: ListChecks,
      title: "Le choix, tâche par tâche",
    },
    {
      description:
        "Ce qui est appliqué apparaît dans l’activité et dans le journal d’audit, comme toute autre action.",
      icon: History,
      title: "Une trace de ce qui change",
    },
    {
      description:
        "Les requêtes TaskMiner AI restantes sont affichées dans l’application, pour chaque workspace.",
      icon: Gauge,
      title: "Une consommation lisible",
    },
  ];

/**
 * High-contrast band carrying the commercial principle of TaskMiner AI.
 * The `dark` class scopes the dark Facette tokens to this section, so the
 * band reads as an inverted surface in the light theme without any second
 * theme system; in the dark theme it becomes a raised surface.
 */
export function ControlSection() {
  return (
    <section
      aria-labelledby="marketing-control-title"
      className="dark bg-background text-foreground dark:bg-surface relative overflow-hidden border-y py-20 sm:py-24 lg:py-28"
      id="controle"
    >
      <div
        aria-hidden="true"
        className="mk-facet-band pointer-events-none absolute inset-y-0 right-0 w-full max-w-3xl"
      />
      <div
        className={cn(
          marketingContainer,
          "relative grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16",
        )}
      >
        <div>
          <Eyebrow>Notre principe</Eyebrow>
          <h2
            className="mt-4 text-[2.375rem] leading-[1.04] font-semibold tracking-[-0.035em] sm:text-[3.25rem]"
            id="marketing-control-title"
          >
            <span className="block">L’IA propose.</span>{" "}
            <span className="text-brand block">Vous décidez.</span>
          </h2>
          <p className="text-muted-foreground mt-6 max-w-md text-lg leading-relaxed text-pretty">
            TaskMiner AI vous épargne la mise en forme du travail. Les
            décisions, elles, restent les vôtres&nbsp;: TaskMiner n’applique que
            ce que vous avez validé.
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {commitments.map(({ description, icon: Icon, title }) => (
            <li
              className="bg-surface-raised/70 rounded-card border p-5"
              key={title}
            >
              <span className="border-brand-border bg-brand-subtle text-brand flex size-8 items-center justify-center rounded-md border">
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <h3 className="mt-4 text-[0.9375rem] font-semibold">{title}</h3>
              <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                {description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
