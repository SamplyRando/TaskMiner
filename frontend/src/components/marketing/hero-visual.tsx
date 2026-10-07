import { Check } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { Facet } from "@/components/ui/facet";
import {
  FacetNode,
  MockAvatar,
  MockCheck,
  MockPanel,
  MockPriority,
} from "@/components/marketing/marketing-ui";
import { toneDotClasses } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { TaskPriority } from "@/types/task";

/*
 * Hero demonstration: one brief becomes a structured draft, reviewed by a
 * person, then executed on a board. Every element reuses the vocabulary of
 * the real product (step labels of TaskMiner AI, « Inclure la tâche »,
 * « Appliquer le plan », priority badges, board columns). The sample
 * project is illustrative: no customer, metric or result is implied.
 */

const draftTasks: {
  included: boolean;
  milestone?: string;
  priority: TaskPriority;
  title: string;
  week: string;
}[] = [
  {
    included: true,
    priority: "high",
    title: "Cadrer le périmètre du MVP",
    week: "Sem. 1",
  },
  {
    included: true,
    priority: "urgent",
    title: "Développer l’authentification",
    week: "Sem. 3",
  },
  {
    included: true,
    milestone: "Bêta privée",
    priority: "medium",
    title: "Ouvrir la bêta privée",
    week: "Sem. 6",
  },
  {
    included: false,
    priority: "low",
    title: "Traduire l’application en anglais",
    week: "Sem. 8",
  },
];

const boardColumns: {
  cards: {
    assignee: string;
    done?: boolean;
    priority: TaskPriority;
    title: string;
  }[];
  dot: string;
  title: string;
}[] = [
  {
    cards: [
      {
        assignee: "MA",
        priority: "high",
        title: "Intégrer le paiement",
      },
    ],
    dot: toneDotClasses.neutral,
    title: "À faire",
  },
  {
    cards: [
      {
        assignee: "LN",
        priority: "urgent",
        title: "Développer l’authentification",
      },
    ],
    dot: toneDotClasses.info,
    title: "En cours",
  },
  {
    cards: [
      {
        assignee: "CB",
        done: true,
        priority: "high",
        title: "Cadrer le périmètre du MVP",
      },
    ],
    dot: toneDotClasses.success,
    title: "Terminée",
  },
];

function Reveal({
  children,
  className,
  delay,
}: {
  children: ReactNode;
  className?: string;
  delay: number;
}) {
  return (
    <div
      className={cn("mk-reveal", className)}
      style={{ "--mk-delay": `${String(delay)}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

function Connector({
  children,
  icon,
}: {
  children: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="relative flex items-center gap-3 py-3 pl-6 sm:pl-10">
      <span
        aria-hidden="true"
        className="bg-border absolute inset-y-0 left-[2.375rem] w-px sm:left-[3.375rem]"
      />
      <span className="relative">{icon}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function HeroVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto w-full max-w-xl select-none lg:max-w-none"
    >
      {/* The Facette plane: raw material being cut into structure. */}
      <div className="mk-facet-plane pointer-events-none absolute -inset-x-6 -top-8 -bottom-10 sm:-inset-x-10" />

      <div className="relative">
        <Reveal delay={0}>
          <MockPanel
            className="lg:w-[80%]"
            label="Brief du projet"
            meta="1 · Brief"
          >
            <p className="text-foreground/90 px-4 pt-3 text-[0.8125rem] leading-relaxed">
              Lancer notre application mobile de réservation en 8
              semaines&nbsp;: bêta privée en semaine 6, lancement public en
              semaine 8. Équipe&nbsp;: 2 développeurs, 1 designer, 1 chef de
              projet.
            </p>
            <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-3.5">
              <span className="text-muted-foreground text-xs">
                Date cible&nbsp;: semaine 8
              </span>
              <span className="bg-brand text-brand-foreground inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold">
                <Facet className="size-3" tone="current" />
                Générer le plan
              </span>
            </div>
          </MockPanel>
        </Reveal>

        <Reveal delay={180}>
          <Connector icon={<FacetNode />}>
            <p className="text-foreground text-xs font-semibold">
              TaskMiner AI structure le brief
            </p>
            <p className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.6875rem]">
              {[
                "Analyse du brief",
                "Structuration du projet",
                "Organisation des dépendances",
              ].map((step) => (
                <span className="inline-flex items-center gap-1" key={step}>
                  <Check className="text-success size-3" strokeWidth={2.5} />
                  {step}
                </span>
              ))}
            </p>
          </Connector>
        </Reveal>

        <Reveal className="lg:ml-auto lg:w-[90%]" delay={340}>
          <MockPanel
            className="border-brand-border shadow-floating"
            label={
              <span className="inline-flex items-center gap-2">
                Brouillon structuré
                <span className="border-brand-border bg-brand-subtle text-brand rounded-sm border px-1.5 py-px text-[0.625rem] font-semibold tracking-wide uppercase">
                  Revue humaine
                </span>
              </span>
            }
            meta={<span className="hidden sm:inline">9 tâches · 3 jalons</span>}
          >
            <ul className="divide-y">
              {draftTasks.map((task) => (
                <li
                  className={cn(
                    "flex items-center gap-2.5 px-4 py-2",
                    !task.included && "opacity-55",
                  )}
                  key={task.title}
                >
                  <MockCheck checked={task.included} />
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-[0.8125rem] font-medium",
                      !task.included && "line-through",
                    )}
                  >
                    {task.title}
                  </span>
                  {task.milestone ? (
                    <span className="text-brand hidden shrink-0 items-center gap-1 text-[0.6875rem] font-medium sm:inline-flex">
                      <Facet className="size-2.5" tone="current" />
                      {task.milestone}
                    </span>
                  ) : null}
                  <MockPriority priority={task.priority} />
                  <span className="text-muted-foreground hidden w-11 shrink-0 text-right text-[0.6875rem] tabular-nums sm:inline">
                    {task.week}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5">
              <span className="text-muted-foreground text-xs">
                + 5 autres tâches
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-muted-foreground hidden rounded-md px-2 py-1 text-xs font-medium sm:inline">
                  Ignorer le brouillon
                </span>
                <span className="bg-brand text-brand-foreground inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold">
                  Appliquer le plan
                </span>
              </span>
            </div>
          </MockPanel>
        </Reveal>

        <Reveal delay={520}>
          <Connector
            icon={
              <span className="bg-success-subtle border-success-border text-success flex size-7 items-center justify-center rounded-md border">
                <Check className="size-3.5" strokeWidth={2.5} />
              </span>
            }
          >
            <p className="text-foreground text-xs font-semibold">
              Appliqué après votre validation
            </p>
            <p className="text-muted-foreground mt-0.5 text-[0.6875rem]">
              8 tâches créées · 1 écartée par vous
            </p>
          </Connector>
        </Reveal>

        <Reveal delay={680}>
          <MockPanel label="Application mobile · Kanban" meta="3 statuts">
            {/* Board on larger screens… */}
            <div className="hidden grid-cols-3 gap-2 p-2.5 sm:grid">
              {boardColumns.map((column) => (
                <div
                  className="bg-surface-sunken rounded-md border p-1.5"
                  key={column.title}
                >
                  <p className="flex items-center gap-1.5 px-1 pt-0.5 pb-1.5 text-[0.6875rem] font-semibold">
                    <span className={cn("size-1.5 rounded-full", column.dot)} />
                    {column.title}
                  </p>
                  {column.cards.map((card) => (
                    <div
                      className="bg-card rounded-md border p-2 shadow-xs"
                      key={card.title}
                    >
                      <p
                        className={cn(
                          "line-clamp-2 text-[0.75rem] leading-snug font-medium",
                          card.done && "text-muted-foreground",
                        )}
                      >
                        {card.title}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-1.5">
                        {card.done ? (
                          <span className="text-success inline-flex items-center gap-1 text-[0.6875rem] font-medium">
                            <Check className="size-3" strokeWidth={2.5} />
                            Fait
                          </span>
                        ) : (
                          <MockPriority priority={card.priority} />
                        )}
                        <MockAvatar initials={card.assignee} />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {/* …recomposed as a status list on small screens. */}
            <ul className="divide-y sm:hidden">
              {boardColumns.map((column) =>
                column.cards.map((card) => (
                  <li
                    className="flex items-center gap-2.5 px-4 py-2"
                    key={card.title}
                  >
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        column.dot,
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium">
                      {card.title}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-[0.6875rem]">
                      {column.title}
                    </span>
                    <MockAvatar initials={card.assignee} />
                  </li>
                )),
              )}
            </ul>
          </MockPanel>
        </Reveal>
      </div>
    </div>
  );
}
