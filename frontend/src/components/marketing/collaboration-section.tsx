import {
  AtSign,
  Bell,
  FileText,
  Paperclip,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import {
  marketingContainer,
  MockAvatar,
  MockPanel,
  MockPriority,
  SectionHeading,
} from "@/components/marketing/marketing-ui";
import { cn } from "@/lib/utils";

const features: { description: string; icon: LucideIcon; title: string }[] = [
  {
    description:
      "Discutez directement sur la tâche et mentionnez un membre pour le prévenir.",
    icon: AtSign,
    title: "Commentaires et mentions",
  },
  {
    description: "Les fichiers utiles restent attachés à la tâche concernée.",
    icon: Paperclip,
    title: "Pièces jointes",
  },
  {
    description:
      "Assignations, commentaires, mentions et rappels d’échéance, réunis dans l’application.",
    icon: Bell,
    title: "Notifications",
  },
  {
    description:
      "Invitez par e-mail un administrateur, un membre ou un lecteur : chaque rôle a ses propres droits.",
    icon: UserPlus,
    title: "Invitations et rôles",
  },
];

function CollaborationVisual() {
  return (
    <div aria-hidden="true" className="relative select-none sm:mb-8">
      <MockPanel
        label="Maquetter le parcours de réservation"
        meta={<MockPriority priority="high" />}
      >
        <div className="space-y-4 px-4 pt-4 pb-4 sm:pb-16">
          <div className="flex gap-2.5">
            <MockAvatar className="size-6" initials="LN" />
            <div className="min-w-0 flex-1">
              <p className="text-[0.75rem]">
                <span className="font-semibold">Léa N.</span>{" "}
                <span className="text-muted-foreground">il y a 2 h</span>
              </p>
              <p className="mt-1 text-[0.8125rem] leading-snug">
                La V2 des maquettes est prête.{" "}
                <span className="bg-brand-subtle text-brand rounded-sm px-1 font-medium">
                  @Marion
                </span>
                , peux-tu valider le parcours de paiement&#8239;?
              </p>
              <span className="bg-surface-sunken mt-2 inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[0.75rem]">
                <FileText className="text-muted-foreground size-3.5" />
                maquettes-v2.pdf
              </span>
            </div>
          </div>
          <div className="flex gap-2.5">
            <MockAvatar className="size-6" initials="MA" />
            <div className="min-w-0 flex-1">
              <p className="text-[0.75rem]">
                <span className="font-semibold">Marion A.</span>{" "}
                <span className="text-muted-foreground">il y a 35 min</span>
              </p>
              <p className="mt-1 text-[0.8125rem] leading-snug">
                Validé de mon côté, on peut passer au développement.
              </p>
            </div>
          </div>
        </div>
      </MockPanel>

      <div className="bg-popover shadow-floating rounded-floating relative mt-4 ml-auto w-full max-w-sm border p-3.5 sm:absolute sm:-right-4 sm:-bottom-6 sm:mt-0 sm:w-72 lg:-right-8">
        <div className="flex gap-3">
          <span className="bg-brand-subtle text-brand border-brand-border flex size-7 shrink-0 items-center justify-center rounded-md border">
            <AtSign className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.8125rem] font-semibold">Mention</p>
            <p className="text-muted-foreground mt-0.5 text-[0.75rem] leading-snug">
              Léa N. vous a mentionné dans un commentaire.
            </p>
          </div>
          <span className="bg-brand mt-1.5 size-2 shrink-0 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function CollaborationSection() {
  return (
    <section
      aria-labelledby="marketing-collaboration-title"
      className="bg-surface-sunken/50 border-y py-20 sm:py-24 lg:py-28"
      id="collaboration"
    >
      <div
        className={cn(
          marketingContainer,
          "grid grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16",
        )}
      >
        <div className="lg:order-last">
          <SectionHeading
            eyebrow="Collaboration"
            id="marketing-collaboration-title"
            lead="Les échanges restent attachés au travail : commentaires, mentions, pièces jointes et notifications, au même endroit que les tâches."
            title="Toute l’équipe sur le même plan."
          />
          <ul className="mt-8 grid gap-6 sm:grid-cols-2">
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
        <CollaborationVisual />
      </div>
    </section>
  );
}
