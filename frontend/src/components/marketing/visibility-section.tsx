import {
  AlarmClock,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Gauge,
  ListTodo,
  MessageSquareText,
  ShieldCheck,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";

import {
  marketingContainer,
  MockAvatar,
  MockPanel,
  MockPriority,
  SectionHeading,
} from "@/components/marketing/marketing-ui";
import { Badge } from "@/components/ui/badge";
import { toneBadgeClasses, toneDotClasses, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { TaskPriority } from "@/types/task";

const kpis: { icon: LucideIcon; label: string; tone: string; value: string }[] =
  [
    { icon: ListTodo, label: "Tâches", tone: "text-brand", value: "24" },
    {
      icon: CheckCircle2,
      label: "Terminées",
      tone: "text-success",
      value: "15",
    },
    {
      icon: AlarmClock,
      label: "En retard",
      tone: "text-destructive",
      value: "2",
    },
    { icon: Gauge, label: "Complétion", tone: "text-info", value: "62\u00a0%" },
  ];

const statusBars = [
  { label: "À faire", tone: toneDotClasses.neutral, width: "25%" },
  { label: "En cours", tone: toneDotClasses.info, width: "13%" },
  { label: "Terminées", tone: toneDotClasses.success, width: "62%" },
];

const priorityCounts: { count: number; priority: TaskPriority }[] = [
  { count: 5, priority: "low" },
  { count: 9, priority: "medium" },
  { count: 7, priority: "high" },
  { count: 3, priority: "urgent" },
];

const events: {
  actor: string;
  icon: LucideIcon;
  message: string;
  time: string;
  tone: Tone;
}[] = [
  {
    actor: "CB",
    icon: UserRoundCheck,
    message: "Tâche assignée : Brancher le nouveau paiement",
    time: "il y a 4 min",
    tone: "brand",
  },
  {
    actor: "LN",
    icon: MessageSquareText,
    message: "Commentaire ajouté",
    time: "il y a 12 min",
    tone: "neutral",
  },
  {
    actor: "MA",
    icon: BriefcaseBusiness,
    message: "Tâche créée : Tests de non-régression",
    time: "il y a 1 h",
    tone: "success",
  },
];

const pillars = [
  {
    description:
      "Indicateurs, tendances et répartition des priorités, par workspace.",
    title: "Tableau de bord",
  },
  {
    description:
      "Chaque événement du workspace, en direct, filtrable par personne ou par type.",
    title: "Activité",
  },
  {
    description:
      "Une trace immuable des opérations sensibles, réservée aux propriétaires et administrateurs.",
    title: "Journal d’audit",
  },
];

function VisibilityVisual() {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-1 gap-4 select-none lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
    >
      <MockPanel label="Tableau de bord" meta="30 derniers jours">
        <div className="bg-border grid grid-cols-2 gap-px border-b sm:grid-cols-4">
          {kpis.map(({ icon: Icon, label, tone, value }) => (
            <div className="bg-card px-4 py-3.5" key={label}>
              <p className="text-muted-foreground flex items-center gap-1.5 text-[0.6875rem] font-medium">
                <Icon className={cn("size-3.5", tone)} />
                {label}
              </p>
              <p className="mt-1.5 text-xl font-semibold tracking-tight tabular-nums">
                {value}
              </p>
            </div>
          ))}
        </div>
        <div className="space-y-2.5 px-4 py-3.5">
          <p className="text-[0.75rem] font-semibold">Répartition par statut</p>
          <div className="bg-surface-sunken flex h-2 overflow-hidden rounded-full">
            {statusBars.map((bar) => (
              <span
                className={cn("h-full", bar.tone)}
                key={bar.label}
                style={{ width: bar.width }}
              />
            ))}
          </div>
          <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-[0.6875rem]">
            {statusBars.map((bar) => (
              <span
                className="inline-flex items-center gap-1.5"
                key={bar.label}
              >
                <span className={cn("size-1.5 rounded-full", bar.tone)} />
                {bar.label}
              </span>
            ))}
          </div>
        </div>
        <div className="border-t px-4 py-3.5">
          <p className="text-[0.75rem] font-semibold">Priorités</p>
          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {priorityCounts.map(({ count, priority }) => (
              <div
                className="bg-surface-sunken flex items-center justify-between gap-2 rounded-md border px-2.5 py-2"
                key={priority}
              >
                <MockPriority priority={priority} />
                <span className="text-sm font-semibold tabular-nums">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </MockPanel>

      <div className="grid min-w-0 grid-cols-1 gap-4">
        <MockPanel
          label="Activité"
          meta={
            <span className="text-success inline-flex items-center gap-1.5 font-medium">
              <span className="bg-success ring-success/25 size-1.5 rounded-full ring-[3px]" />
              En direct
            </span>
          }
        >
          <ul className="space-y-0 px-4 py-2">
            {events.map(({ actor, icon: Icon, message, time, tone }) => (
              <li className="flex items-center gap-2.5 py-1.5" key={message}>
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-md border",
                    toneBadgeClasses[tone],
                  )}
                >
                  <Icon className="size-3" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.75rem] font-medium">
                  {message}
                </span>
                <MockAvatar initials={actor} />
                <span className="text-muted-foreground hidden shrink-0 text-[0.6875rem] tabular-nums sm:inline">
                  {time}
                </span>
              </li>
            ))}
          </ul>
        </MockPanel>

        <MockPanel label="Journal d’audit" meta="Trace immuable">
          <div className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="info">Modification</Badge>
              <Badge variant="outline">Tâche</Badge>
              <Badge className="ml-auto" variant="success">
                <ShieldCheck className="size-3" />
                Succès
              </Badge>
            </div>
            <p className="mt-2 truncate text-[0.75rem] font-medium">
              Tâche modifiée&nbsp;: Intégrer le paiement
            </p>
            <p className="bg-surface-sunken text-muted-foreground mt-2 flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[0.6875rem]">
              Évolution
              <ArrowRight className="size-3" />
              <span className="text-foreground">priorité, échéance</span>
            </p>
          </div>
        </MockPanel>
      </div>
    </div>
  );
}

export function VisibilitySection() {
  return (
    <section
      aria-labelledby="marketing-visibility-title"
      className="py-20 sm:py-24 lg:py-28"
      id="visibilite"
    >
      <div className={marketingContainer}>
        <SectionHeading
          eyebrow="Visibilité"
          id="marketing-visibility-title"
          lead="Tableau de bord, activité en direct et journal d’audit : l’avancement réel se lit en un coup d’œil, sans aller chercher l’information."
          title="Où en est vraiment le travail ?"
        />
        <div className="mt-12">
          <VisibilityVisual />
        </div>
        <dl className="mt-10 grid gap-6 sm:grid-cols-3">
          {pillars.map((pillar) => (
            <div className="border-t pt-4" key={pillar.title}>
              <dt className="text-[0.9375rem] font-semibold">{pillar.title}</dt>
              <dd className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {pillar.description}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
