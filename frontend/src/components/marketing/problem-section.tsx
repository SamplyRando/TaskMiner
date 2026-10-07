import {
  CalendarClock,
  FileQuestion,
  Layers,
  ListX,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  marketingContainer,
  SectionHeading,
} from "@/components/marketing/marketing-ui";
import { cn } from "@/lib/utils";

const frictions: { detail: string; icon: LucideIcon; title: string }[] = [
  {
    detail: "entre messages, réunions et documents.",
    icon: Layers,
    title: "Un brief dispersé",
  },
  {
    detail: "tout paraît urgent, rien n’est ordonné.",
    icon: FileQuestion,
    title: "Des priorités floues",
  },
  {
    detail: "ce qui n’est écrit nulle part n’avance pas.",
    icon: ListX,
    title: "Des tâches oubliées",
  },
  {
    detail: "le projet change, le plan ne suit pas.",
    icon: CalendarClock,
    title: "Un plan vite dépassé",
  },
  {
    detail: "personne ne sait vraiment où en est le travail.",
    icon: Users,
    title: "Une équipe désalignée",
  },
];

// Raw context as it usually arrives — the "matière brute" of a project.
const fragments = [
  { quote: "On vise une bêta avant l’été, si possible.", source: "Réunion" },
  { quote: "Le paiement doit être prêt pour le lancement.", source: "E-mail" },
  { quote: "Qui s’occupe des maquettes ?", source: "Message" },
  {
    quote: "Contraintes : 2 devs, 1 designer, budget serré.",
    source: "Document",
  },
  { quote: "Le client veut avancer la bêta d’une semaine.", source: "Message" },
];

export function ProblemSection() {
  return (
    <section
      aria-labelledby="marketing-problem-title"
      className="border-t py-20 sm:py-24 lg:py-28"
      id="probleme"
    >
      <div
        className={cn(
          marketingContainer,
          "grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-16",
        )}
      >
        <div>
          <SectionHeading
            id="marketing-problem-title"
            lead="Le contexte arrive par morceaux, les priorités restent implicites et le plan vieillit dès la première semaine. Avant d’exécuter, l’équipe passe déjà du temps à s’organiser."
            title="Un projet commence rarement avec un plan clair."
          />
          <ul className="mt-10 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {frictions.map(({ detail, icon: Icon, title }) => (
              <li className="flex gap-3" key={title}>
                <span className="bg-surface-sunken text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md border">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <p className="text-sm leading-relaxed">
                  <span className="text-foreground font-semibold">{title}</span>
                  {"\u00a0: "}
                  <span className="text-muted-foreground">{detail}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>

        <figure className="self-center">
          <figcaption className="text-muted-foreground mb-4 text-xs font-medium tracking-wide uppercase">
            Le contexte, tel qu’il arrive
          </figcaption>
          <ul className="grid gap-3 sm:grid-cols-2">
            {fragments.map((fragment, index) => (
              <li
                className={cn(
                  "bg-surface-sunken/60 rounded-card border border-dashed px-4 py-3",
                  index === 0 && "sm:col-span-2",
                )}
                key={fragment.quote}
              >
                <p className="text-muted-foreground text-[0.6875rem] font-semibold tracking-wide uppercase">
                  {fragment.source}
                </p>
                <blockquote className="text-foreground/85 mt-1 text-sm leading-snug">
                  «&nbsp;{fragment.quote}&nbsp;»
                </blockquote>
              </li>
            ))}
          </ul>
        </figure>
      </div>
    </section>
  );
}
