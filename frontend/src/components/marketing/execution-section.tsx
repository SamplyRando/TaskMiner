import {
  BellRing,
  Columns3,
  Copy,
  Flag,
  ListChecks,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

import {
  marketingContainer,
  MockAvatar,
  MockPanel,
  MockPriority,
  SectionHeading,
} from "@/components/marketing/marketing-ui";
import { toneDotClasses } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { TaskPriority } from "@/types/task";

const features: { description: string; icon: LucideIcon; title: string }[] = [
  {
    description:
      "Deux vues sur les mêmes tâches, avec recherche, filtres et édition rapide du statut ou de la priorité.",
    icon: ListChecks,
    title: "Liste et Kanban",
  },
  {
    description:
      "De 2 à 10 statuts par projet, adaptés à votre façon de travailler.",
    icon: Columns3,
    title: "Statuts personnalisés",
  },
  {
    description:
      "Quatre niveaux, de Basse à Urgente. Les échéances dépassées sont signalées.",
    icon: Flag,
    title: "Priorités et échéances",
  },
  {
    description: "Assignez chaque tâche à un membre de l’équipe.",
    icon: UserCheck,
    title: "Assignations",
  },
  {
    description:
      "Des notifications dans l’application avant l’échéance d’une tâche ou d’un projet.",
    icon: BellRing,
    title: "Rappels d’échéance",
  },
  {
    description:
      "Dupliquez un projet ou réutilisez sa structure grâce aux modèles.",
    icon: Copy,
    title: "Duplication et modèles",
  },
];

const statusDots: Record<string, string> = {
  "À faire": toneDotClasses.neutral,
  "À valider": toneDotClasses.warning,
  "En cours": toneDotClasses.info,
  Terminée: toneDotClasses.success,
};

const listRows: {
  assignee: string;
  late?: boolean;
  priority: TaskPriority;
  status: string;
  title: string;
  week: string;
}[] = [
  {
    assignee: "CB",
    late: true,
    priority: "urgent",
    status: "En cours",
    title: "Brancher le nouveau paiement",
    week: "Sem. 2",
  },
  {
    assignee: "MA",
    priority: "high",
    status: "En cours",
    title: "Migrer le catalogue",
    week: "Sem. 3",
  },
  {
    assignee: "LN",
    priority: "high",
    status: "À valider",
    title: "Tests de non-régression",
    week: "Sem. 4",
  },
  {
    assignee: "MA",
    priority: "medium",
    status: "À faire",
    title: "Refaire la page produit",
    week: "Sem. 5",
  },
];

const boardColumns: {
  cards: { assignee: string; priority: TaskPriority; title: string }[];
  title: string;
}[] = [
  {
    cards: [
      { assignee: "MA", priority: "medium", title: "Refaire la page produit" },
      { assignee: "LN", priority: "low", title: "Mettre à jour les CGV" },
    ],
    title: "À faire",
  },
  {
    cards: [
      {
        assignee: "CB",
        priority: "urgent",
        title: "Brancher le nouveau paiement",
      },
    ],
    title: "En cours",
  },
  {
    cards: [
      { assignee: "LN", priority: "high", title: "Tests de non-régression" },
    ],
    title: "À valider",
  },
  {
    cards: [{ assignee: "MA", priority: "high", title: "Choisir l’hébergeur" }],
    title: "Terminée",
  },
];

function ExecutionVisual() {
  return (
    <div aria-hidden="true" className="relative select-none">
      <MockPanel label="Refonte e-commerce · Liste" meta="12 tâches">
        <div className="text-muted-foreground hidden grid-cols-[minmax(0,1fr)_6.5rem_5.5rem_2rem_3.5rem] gap-3 border-b px-4 py-2 text-[0.6875rem] font-medium sm:grid">
          <span>Titre</span>
          <span>Statut</span>
          <span>Priorité</span>
          <span />
          <span className="text-right">Échéance</span>
        </div>
        <ul className="divide-y">
          {listRows.map((row) => (
            <li
              className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_6.5rem_5.5rem_2rem_3.5rem]"
              key={row.title}
            >
              <span className="truncate text-[0.8125rem] font-medium">
                {row.title}
              </span>
              <span className="hidden items-center gap-1.5 text-[0.75rem] font-medium sm:inline-flex">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    statusDots[row.status],
                  )}
                />
                {row.status}
              </span>
              <span>
                <MockPriority priority={row.priority} />
              </span>
              <MockAvatar initials={row.assignee} />
              <span
                className={cn(
                  "hidden text-right text-[0.75rem] tabular-nums sm:inline",
                  row.late
                    ? "text-destructive font-medium"
                    : "text-muted-foreground",
                )}
              >
                {row.week}
              </span>
            </li>
          ))}
        </ul>
        {/* Room for the board overlapping this panel on large screens. */}
        <div className="hidden h-10 lg:block" />
      </MockPanel>

      <MockPanel
        className="shadow-floating relative mt-4 lg:-mt-8 lg:ml-[14%]"
        label="Refonte e-commerce · Kanban"
        meta="Statuts du projet"
      >
        <div className="grid grid-cols-2 gap-2 p-2.5 sm:grid-cols-4">
          {boardColumns.map((column, index) => (
            <div
              className={cn(
                "bg-surface-sunken rounded-md border p-1.5",
                index > 1 && "hidden sm:block",
              )}
              key={column.title}
            >
              <p className="flex items-center gap-1.5 px-1 pt-0.5 pb-1.5 text-[0.6875rem] font-semibold">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    statusDots[column.title],
                  )}
                />
                {column.title}
              </p>
              <div className="space-y-1.5">
                {column.cards.map((card) => (
                  <div
                    className="bg-card rounded-md border p-2 shadow-xs"
                    key={card.title}
                  >
                    <p className="line-clamp-2 text-[0.75rem] leading-snug font-medium">
                      {card.title}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-1.5">
                      <MockPriority priority={card.priority} />
                      <MockAvatar initials={card.assignee} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </MockPanel>
    </div>
  );
}

export function ExecutionSection() {
  return (
    <section
      aria-labelledby="marketing-execution-title"
      className="py-20 sm:py-24 lg:py-28"
      id="produit"
    >
      <div className={marketingContainer}>
        <SectionHeading
          eyebrow="Exécution"
          id="marketing-execution-title"
          lead="Une fois appliqué, le plan vit dans TaskMiner. Votre équipe avance en liste ou en Kanban, sur des statuts adaptés à chaque projet."
          title="Le plan validé devient votre espace de travail."
        />
        <div className="mt-12 grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-14">
          <ExecutionVisual />
          <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-1">
            {features.map(({ description, icon: Icon, title }) => (
              <li className="flex gap-3.5" key={title}>
                <span className="bg-brand-subtle text-brand border-brand-border flex size-8 shrink-0 items-center justify-center rounded-md border">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <div>
                  <h3 className="text-[0.9375rem] font-semibold">{title}</h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
