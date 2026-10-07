import { ArrowRight, Check } from "lucide-react";

import {
  FacetNode,
  marketingContainer,
  MockCheck,
  MockPanel,
  MockPriority,
  SectionHeading,
} from "@/components/marketing/marketing-ui";
import { cn } from "@/lib/utils";
import type { TaskPriority } from "@/types/task";

const points = [
  "Chaque proposition montre la valeur avant et après.",
  "Chaque modification est accompagnée de sa raison.",
  "Vous excluez ce qui ne convient pas, tâche par tâche.",
  "Rien ne change avant « Appliquer les modifications ».",
];

type Change = {
  field: string;
  included: boolean;
  reason: string;
  task: string;
} & (
  | { after: string; before: string; kind: "text" }
  | { after: TaskPriority; before: TaskPriority; kind: "priority" }
);

const changes: Change[] = [
  {
    after: "Sem. 5",
    before: "Sem. 6",
    field: "Échéance",
    included: true,
    kind: "text",
    reason: "La bêta privée est avancée d’une semaine.",
    task: "Ouvrir la bêta privée",
  },
  {
    after: "urgent",
    before: "high",
    field: "Priorité",
    included: true,
    kind: "priority",
    reason: "Le paiement conditionne la bêta.",
    task: "Intégrer le paiement",
  },
  {
    after: "Sem. 5",
    before: "Sem. 7",
    field: "Échéance",
    included: false,
    kind: "text",
    reason: "Suivre la nouvelle date de la bêta.",
    task: "Rédiger la FAQ de lancement",
  },
];

function AdaptationVisual() {
  return (
    <div aria-hidden="true" className="select-none">
      <MockPanel label="Modifier un projet" meta="Application mobile">
        <div className="px-4 pt-3 pb-4">
          <p className="text-muted-foreground text-[0.6875rem] font-medium">
            Instruction
          </p>
          <p className="bg-surface-sunken mt-1.5 rounded-md border px-3 py-2 text-[0.8125rem] leading-snug">
            Avance la bêta privée d’une semaine et passe les tâches de paiement
            en priorité urgente.
          </p>
        </div>
      </MockPanel>

      <div className="flex items-center gap-3 py-3 pl-4">
        <FacetNode />
        <p className="text-muted-foreground text-xs">
          TaskMiner AI relit le projet et prépare des modifications
        </p>
      </div>

      <MockPanel
        className="border-brand-border shadow-floating"
        label="Modifications proposées"
        meta="3 tâches concernées"
      >
        <ul className="divide-y">
          {changes.map((change) => (
            <li
              className={cn("px-4 py-3", !change.included && "opacity-55")}
              key={change.task}
            >
              <div className="flex items-center gap-2.5">
                <MockCheck checked={change.included} />
                <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold">
                  {change.task}
                </span>
              </div>
              <div className="mt-2 ml-6.5 flex flex-wrap items-center gap-2 text-[0.75rem]">
                <span className="text-muted-foreground w-16 shrink-0">
                  {change.field}
                </span>
                {change.kind === "priority" ? (
                  <>
                    <MockPriority priority={change.before} />
                    <ArrowRight className="text-muted-foreground size-3.5" />
                    <MockPriority priority={change.after} />
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground tabular-nums line-through">
                      {change.before}
                    </span>
                    <ArrowRight className="text-muted-foreground size-3.5" />
                    <span className="font-medium tabular-nums">
                      {change.after}
                    </span>
                  </>
                )}
              </div>
              <p className="text-muted-foreground mt-1.5 ml-6.5 text-[0.75rem] leading-snug">
                Raison&nbsp;: {change.reason}
              </p>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-end gap-1.5 border-t px-4 py-2.5">
          <span className="text-muted-foreground rounded-md px-2 py-1 text-xs font-medium">
            Ignorer le brouillon
          </span>
          <span className="bg-brand text-brand-foreground inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold">
            Appliquer les modifications
          </span>
        </div>
      </MockPanel>
    </div>
  );
}

export function AdaptationSection() {
  return (
    <section
      aria-labelledby="marketing-adaptation-title"
      className="bg-surface-sunken/50 border-y py-20 sm:py-24 lg:py-28"
      id="adaptation"
    >
      <div
        className={cn(
          marketingContainer,
          "grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16",
        )}
      >
        <div>
          <SectionHeading
            eyebrow="Adaptation"
            id="marketing-adaptation-title"
            lead="Décrivez le changement en une phrase. TaskMiner AI relit le projet et propose des modifications de tâches existantes : titre, description, statut, priorité ou échéance."
            title="Le projet change ? Le plan suit."
          />
          <ul className="mt-8 space-y-3">
            {points.map((point) => (
              <li
                className="flex items-start gap-3 text-sm leading-relaxed"
                key={point}
              >
                <Check
                  aria-hidden="true"
                  className="text-brand mt-0.5 size-4 shrink-0"
                  strokeWidth={2.5}
                />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <AdaptationVisual />
      </div>
    </section>
  );
}
